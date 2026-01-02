import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.client_reference_id;
        
        if (!customerEmail) {
          console.error('No customer email in checkout session');
          break;
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: customerEmail.toLowerCase() }
        });

        if (!user) {
          console.error('User not found for email:', customerEmail);
          break;
        }

        // Create or update subscription
        await prisma.subscription.upsert({
          where: { stripeCustomerId: session.customer },
          update: {
            stripeSubscriptionId: session.subscription,
            status: 'active',
            stripePriceId: session.line_items?.data[0]?.price?.id,
            currentPeriodEnd: session.subscription 
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
              : null,
            updatedAt: new Date()
          },
          create: {
            userId: user.id,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: 'active',
            stripePriceId: session.line_items?.data[0]?.price?.id,
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          }
        });

        // Create workspace for user if they don't have one
        const existingWorkspace = await prisma.workspaceUser.findFirst({
          where: { userId: user.id }
        });

        if (!existingWorkspace) {
          const workspace = await prisma.workspace.create({
            data: {
              name: `${user.firstName || user.email}'s Workspace`
            }
          });

          await prisma.workspaceUser.create({
            data: {
              userId: user.id,
              workspaceId: workspace.id,
              role: 'owner'
            }
          });
        }

        console.log('Subscription created for user:', user.email);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: new Date()
          }
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
