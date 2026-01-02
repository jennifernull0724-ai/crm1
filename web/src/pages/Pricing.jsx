import React, { useState } from 'react';
import PublicLayout from '../components/PublicLayout.jsx';

const PLANS = [
  {
    id: 'growth',
    name: 'Growth',
    price: 2999,
    priceId: 'price_1Sj2ojAqLLDC50j4uAJmpYl7',
    seats: 'Base seats included',
    cta: 'Purchase Growth',
    action: 'checkout'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4999,
    priceId: 'price_1Sj2pEAqLLDC50j4AeBP4azi',
    seatPriceId: 'price_1SjdLiAqLLDC50j4JhLgf3Vv',
    seatPrice: 250,
    seats: 'Base + additional seats',
    cta: 'Purchase Pro',
    action: 'checkout'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 6999,
    priceId: 'price_1ShISRAqLLDC50j4iguEmnTB',
    seats: 'Contract negotiated',
    cta: 'Purchase Enterprise',
    action: 'checkout'
  }
];

function PricingHeader() {
  return (
    <section className="pr-header">
      <div className="pr-container">
        <h1 className="pr-h1">Pricing</h1>
        <p className="pr-lead">Yearly billing. Enterprise contracting available.</p>
      </div>
    </section>
  );
}

function PricingCard({ plan, seatCount, onSeatChange, promoCode, onPromoChange, onPurchase, loading }) {
  const totalPrice = plan.id === 'pro' && seatCount > 0
    ? plan.price + (seatCount * plan.seatPrice)
    : plan.price;

  const handleClick = () => {
    onPurchase(plan.priceId, plan.seatPriceId, seatCount, promoCode);
  };

  return (
    <div className="pr-card">
      <div className="pr-plan-name">{plan.name}</div>
      <div className="pr-price">${totalPrice.toLocaleString()}</div>
      <div className="pr-unit">/ year</div>
      <div className="pr-description">{plan.seats}</div>
      
      {plan.id === 'pro' && (
        <div className="pr-seat-selector">
          <label className="pr-seat-label">Additional seats</label>
          <input
            type="number"
            min="0"
            max="100"
            value={seatCount}
            onChange={(e) => onSeatChange(parseInt(e.target.value) || 0)}
            disabled={loading}
          />
          <div className="pr-seat-note">${plan.seatPrice} / seat / year</div>
        </div>
      )}
      
      {plan.id === 'enterprise' && (
        <div className="pr-seat-selector">
          <label className="pr-seat-label">Promo Code (Optional)</label>
          <input
            type="text"
            value={promoCode || ''}
            onChange={(e) => onPromoChange(e.target.value)}
            placeholder="Enter promo code"
            disabled={loading}
          />
        </div>
      )}
      
      <button 
        onClick={handleClick} 
        className="pr-btn"
        disabled={loading}
      >
        {loading ? 'Processing...' : plan.cta}
      </button>
    </div>
  );
}

function PricingCards({ onPurchase, loading }) {
  const [proSeats, setProSeats] = useState(0);
  const [enterprisePromo, setEnterprisePromo] = useState('');

  return (
    <section className="pr-section">
      <div className="pr-container">
        <div className="pr-grid-3">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              seatCount={plan.id === 'pro' ? proSeats : 0}
              onSeatChange={plan.id === 'pro' ? setProSeats : null}
              promoCode={plan.id === 'enterprise' ? enterprisePromo : null}
              onPromoChange={plan.id === 'enterprise' ? setEnterprisePromo : null}
              onPurchase={onPurchase}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className="pr-section pr-section-alt">
      <div className="pr-container">
        <h2 className="pr-h2">Plan comparison</h2>
        <div className="pr-table">
          <table className="pr-comparison">
            <thead>
              <tr>
                <th></th>

                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Billing cadence</td>
                <td>Yearly</td>
                <td>Yearly</td>
                <td>Yearly</td>
              </tr>
              <tr>
                <td>Base seats</td>
                <td>Included</td>
                <td>Included</td>
                <td>Contract based</td>
              </tr>
              <tr>
                <td>Additional seats</td>
                <td>Not available</td>
                <td>$250 / seat / year</td>
                <td>Contract based</td>
              </tr>
              <tr>
                <td>Support level</td>
                <td>Standard</td>
                <td>Priority</td>
                <td>Dedicated</td>
              </tr>
              <tr>
                <td>Contracting</td>
                <td>Standard terms</td>
                <td>Standard terms</td>
                <td>Custom contract</td>
              </tr>
              <tr>
                <td>Invoicing</td>
                <td>Stripe</td>
                <td>Stripe</td>
                <td>Direct invoice</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function BillingDisclosure() {
  return (
    <section className="pr-section">
      <div className="pr-container">
        <h2 className="pr-h2">Billing details</h2>
        <div className="pr-disclosure">
          <p>Yearly billing only. No monthly plans available.</p>
          <p>Stripe handles payment processing and tax calculation.</p>
          <p>Promotional codes and coupons accepted at checkout.</p>
          <p>Enterprise plans support direct invoicing and custom payment terms.</p>
        </div>
      </div>
    </section>
  );
}

async function createCheckoutSession(priceId, seatPriceId, seatCount, promoCode) {
  const lineItems = [{ price: priceId, quantity: 1 }];
  
  if (seatPriceId && seatCount > 0) {
    lineItems.push({ price: seatPriceId, quantity: seatCount });
  }

  const body = {
    priceId,
    seatCount,
    allowCoupons: true,
    lineItems
  };

  if (promoCode && promoCode.trim()) {
    body.promoCode = promoCode.trim();
  }

  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  const { sessionId } = await response.json();
  
  if (!sessionId) {
    throw new Error('No session ID returned from server');
  }

  // Check if Stripe.js is loaded
  if (!window.Stripe) {
    throw new Error('Stripe.js not loaded. Please refresh the page and try again.');
  }

  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!stripeKey) {
    throw new Error('Stripe publishable key not configured');
  }

  const stripe = window.Stripe(stripeKey);
  const result = await stripe.redirectToCheckout({ sessionId });
  
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export default function Pricing() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (priceId, seatPriceId, seatCount) => {
    setError('');
    setLoading(true);
    
    try {
      await createCheckoutSession(priceId, seatPriceId, seatCount);
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="pr">
        <PricingHeader />
        {error && (
          <div className="pr-container">
            <div className="pr-error-alert">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
        <PricingCards onPurchase={handlePurchase} loading={loading} />
        <ComparisonTable />
        <BillingDisclosure />
      </div>
    </PublicLayout>
  );
}
