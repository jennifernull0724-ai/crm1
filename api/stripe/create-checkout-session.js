import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lineItems, allowCoupons = true } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'Invalid line items' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/pricing`,
      allow_promotion_codes: allowCoupons,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return res.status(500).json({ error: error.message });
  }
}
