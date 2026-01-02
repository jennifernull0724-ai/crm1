import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lineItems, allowCoupons = true, promoCode, userEmail } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'Invalid line items' });
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/login?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/pricing`,
      allow_promotion_codes: allowCoupons,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    };

    // Add customer email if provided
    if (userEmail) {
      sessionConfig.customer_email = userEmail;
      sessionConfig.client_reference_id = userEmail;
    }

    // If a promo code is provided, apply it directly (instead of allowing user input)
    if (promoCode && promoCode.trim()) {
      // Validate and apply the promo code
      const promos = await stripe.promotionCodes.list({
        code: promoCode.trim(),
        active: true,
        limit: 1,
      });

      if (promos.data.length > 0) {
        sessionConfig.discounts = [{
          promotion_code: promos.data[0].id
        }];
        // Disable the promotion code field since we're applying one
        sessionConfig.allow_promotion_codes = false;
      } else {
        return res.status(400).json({ error: 'Invalid promo code' });
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return res.status(500).json({ error: error.message });
  }
}
