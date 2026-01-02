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

function PricingCard({ plan, seatCount, onSeatChange, onPurchase }) {
  const totalPrice = plan.id === 'pro' && seatCount > 0
    ? plan.price + (seatCount * plan.seatPrice)
    : plan.price;

  const handleClick = () => {
    onPurchase(plan.priceId, plan.seatPriceId, seatCount);
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
          />
          <div className="pr-seat-note">${plan.seatPrice} / seat / year</div>
        </div>
      )}
      
      <button 
        onClick={handleClick} 
        className="pr-btn"
        disabled={plan.action === 'disabled'}
      >
        {plan.cta}
      </button>
    </div>
  );
}

function PricingCards({ onPurchase }) {
  const [proSeats, setProSeats] = useState(0);

  return (
    <section className="pr-section">
      <div className="pr-container">
        <div className="pr-grid-3">
          {PLANS.map((plan) => (4
            <PricingCard
              key={plan.id}
              plan={plan}
              seatCount={plan.id === 'pro' ? proSeats : 0}
              onSeatChange={plan.id === 'pro' ? setProSeats : null}
              onPurchase={onPurchase}
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

async function createCheckoutSession(priceId, seatPriceId, seatCount) {
  const lineItems = [{ price: priceId, quantity: 1 }];
  
  if (seatPriceId && seatCount > 0) {
    lineItems.push({ price: seatPriceId, quantity: seatCount });
  }

  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId,
      seatCount,
      allowCoupons: true,
      lineItems
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const { sessionId } = await response.json();
  
  const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  await stripe.redirectToCheckout({ sessionId });
}

export default function Pricing() {
  const handlePurchase = async (priceId, seatPriceId, seatCount) => {
    try {
      await createCheckoutSession(priceId, seatPriceId, seatCount);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <PublicLayout>
      <div className="pr">
        <PricingHeader />
        <PricingCards onPurchase={handlePurchase} />
        <ComparisonTable />
        <BillingDisclosure />
      </div>
    </PublicLayout>
  );
}
