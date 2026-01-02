import React from 'react';
import heroImageUrl from '../assets/hero-atlas.webp';

const primaryCtaLabel = 'Request access';

function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 18 18',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true
  };

  switch (name) {
    case 'spark':
      return (
        <svg {...common}>
          <path d="M9 1.75l1.5 4.5L15 8.25l-4.5 1.5L9 14.25l-1.5-4.5L3 8.25l4.5-2L9 1.75z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <path d="M2.5 2.5h5.5v5.5H2.5V2.5zM10 2.5h5.5v5.5H10V2.5zM2.5 10h5.5v5.5H2.5V10zM10 10h5.5v5.5H10V10z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'link':
      return (
        <svg {...common}>
          <path d="M7 6.5l-1 1a3 3 0 104.25 4.25l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M11 11.5l1-1A3 3 0 107.75 4.25l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M9 2l6 2.5v5.25c0 3.2-2.05 5.95-6 6.75-3.95-.8-6-3.55-6-6.75V4.5L9 2z" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.2 9.2l1.7 1.7 3.9-4.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function ButtonLink({ href, variant = 'primary', children }) {
  const className = variant === 'secondary' ? 'lp-btn lp-btn-secondary' : 'lp-btn lp-btn-primary';
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

function TextLink({ href, children }) {
  return (
    <a className="lp-text-btn" href={href}>
      {children}
    </a>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <article className="lp-card lp-feature">
      <div className="lp-feature-top">
        <div className="lp-icon" aria-hidden="true">
          <Icon name={icon} />
        </div>
        <h3 className="lp-h3">{title}</h3>
      </div>
      <p className="lp-body lp-body-tight">{description}</p>
    </article>
  );
}

function LogoRow() {
  const logos = ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wide World Importers'];
  return (
    <div className="lp-logos" aria-label="Trusted by teams">
      {logos.map((name) => (
        <div key={name} className="lp-logo">
          {name}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="lp">
      {/* Global Header */}
      <header className="lp-header" aria-label="Global">
        <div className="lp-container lp-header-inner">
          <a className="lp-brand" href="/" aria-label="crm1 home">
            crm1
          </a>

          <nav className="lp-nav" aria-label="Primary">
            <a className="lp-nav-link" href="#capabilities">What you get</a>
            <a className="lp-nav-link" href="#pricing">
              Pricing
            </a>
            <a className="lp-nav-link" href="#security">
              Trust
            </a>
          </nav>

          <div className="lp-header-ctas">
            <ButtonLink href="#request" variant="primary">
              {primaryCtaLabel}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section (IMAGE-BASED) */}
        <section className="lp-hero" aria-label="Hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <h1 className="lp-h1">Customer context your team can rely on.</h1>
              <p className="lp-lede">
                For sales and operations teams who need consistent customer information across handoffs—without scattered tools and guesswork.
              </p>
              <div className="lp-hero-ctas">
                <ButtonLink href="#request" variant="primary">
                  {primaryCtaLabel}
                </ButtonLink>
                <TextLink href="#pricing">See pricing</TextLink>
              </div>
            </div>

            <div className="lp-hero-preview" aria-hidden="true">
              <img
                className="lp-preview-img"
                src={heroImageUrl}
                alt=""
                width="1200"
                height="760"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
            </div>
          </div>
        </section>

        {/* Problem → Outcome */}
        <section className="lp-section" aria-label="Problem and outcome">
          <div className="lp-container">
            <h2 className="lp-h2">From scattered details to consistent execution.</h2>
            <div className="lp-grid-3">
              <div className="lp-card">
                <h3 className="lp-h3">Problem</h3>
                <ul className="lp-bullets">
                  <li>Customer information is spread across tools and inboxes.</li>
                  <li>Handoffs lose details and slow down follow-through.</li>
                  <li>Teams disagree on status and next steps.</li>
                  <li>Process breaks down as volume increases.</li>
                </ul>
              </div>
              <div className="lp-card">
                <h3 className="lp-h3">Outcome</h3>
                <ul className="lp-bullets">
                  <li>A consistent customer record shared across teams.</li>
                  <li>Smoother handoffs with fewer missed details.</li>
                  <li>Clearer coordination and faster decisions.</li>
                  <li>More predictable execution as you grow.</li>
                </ul>
              </div>
              <div className="lp-card">
                <h3 className="lp-h3">Result</h3>
                <p className="lp-body lp-body-tight">
                  crm1 helps teams stay aligned on what matters: the customer story, the current status, and what needs to happen next.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get (Capabilities, Not Screens) */}
        <section className="lp-section lp-section-alt" id="capabilities" aria-label="What you get">
          <div className="lp-container">
            <h2 className="lp-h2">What you get</h2>
            <p className="lp-body">Core capabilities that support consistent customer work—without relying on tribal knowledge.</p>

            <div className="lp-grid-4">
              <FeatureCard
                icon="link"
                title="Customer records"
                description="Keep key customer information organized so teams work from the same foundation."
              />
              <FeatureCard
                icon="grid"
                title="Revenue operations"
                description="Support a consistent sales process so planning and coordination improve over time."
              />
              <FeatureCard
                icon="shield"
                title="Reliability"
                description="Prioritize consistency and predictable behavior so teams can trust the information they share."
              />
              <FeatureCard
                icon="spark"
                title="Reporting foundations"
                description="Standardize what gets measured so teams can align on outcomes and act with confidence."
              />
            </div>
          </div>
        </section>

        {/* Trust / Credibility */}
        <section className="lp-proof" id="security" aria-label="Trust">
          <div className="lp-container lp-proof-inner">
            <h2 className="lp-h2">Built with reliability in mind.</h2>
            <p className="lp-body">Clear boundaries and predictable behavior, designed for teams who care about accuracy and accountability.</p>
            <LogoRow />
            <div className="lp-badges" aria-label="Credibility">
              <div className="lp-badge">Security-minded approach</div>
              <div className="lp-badge">Consistent data foundations</div>
              <div className="lp-badge">Operational reliability</div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="lp-section lp-section-alt" aria-label="Testimonials">
          <div className="lp-container">
            <h2 className="lp-h2">What teams say after switching.</h2>
            <div className="lp-testimonials">
              <div className="lp-quote">
                <p className="lp-quote-text">“We get the full customer story without switching tools.”</p>
                <div className="lp-quote-meta">Avery L. · Ops · Northwind</div>
              </div>
              <div className="lp-quote">
                <p className="lp-quote-text">“Handoffs feel calmer because the timeline is always there.”</p>
                <div className="lp-quote-meta">Jordan P. · Support · Contoso</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="lp-pricing" id="pricing" aria-label="Pricing">
          <div className="lp-container">
            <h2 className="lp-h2">Pricing for teams at different stages.</h2>
            <p className="lp-body">Choose a plan that matches where you are today.</p>

            <div className="lp-grid-3 lp-pricing-grid">
              <div className="lp-pricing-card">
                <div className="lp-plan">Starter</div>
                <div className="lp-plan-sub">For small teams establishing a customer system of record</div>
                <ButtonLink href="#request" variant="secondary">
                  Request access
                </ButtonLink>
              </div>

              <div className="lp-pricing-card lp-pricing-card-featured" aria-label="Featured plan">
                <div className="lp-plan">Team</div>
                <div className="lp-plan-sub">For growing teams standardizing process across functions</div>
                <ButtonLink href="#request" variant="primary">
                  {primaryCtaLabel}
                </ButtonLink>
              </div>

              <div className="lp-pricing-card">
                <div className="lp-plan">Scale</div>
                <div className="lp-plan-sub">For larger teams that need a tailored rollout</div>
                <ButtonLink href="mailto:sales@crm1.local" variant="secondary">
                  Contact sales
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Band */}
        <section className="lp-cta" aria-label="Final call to action" id="request">
          <div className="lp-container lp-cta-inner">
            <div>
              <h2 className="lp-h2">Evaluate it with your team.</h2>
              <p className="lp-body">Request access for a straightforward review. We’ll help you confirm fit and next steps.</p>
            </div>
            <div className="lp-cta-actions">
              <ButtonLink href="mailto:sales@crm1.local" variant="primary">
                {primaryCtaLabel}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer" aria-label="Footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">crm1</div>

          <div className="lp-footer-cols" role="navigation" aria-label="Footer links">
            <div className="lp-footer-col">
              <div className="lp-footer-title">Product</div>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#security">Security</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-title">Company</div>
              <a href="#request">Request</a>
              <a href="mailto:hello@crm1.local">Contact</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-title">Resources</div>
              <a href="#features">Overview</a>
              <a href="#pricing">Plans</a>
              <a href="#request">Contact sales</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-title">Legal</div>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Privacy
              </a>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Terms
              </a>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Accessibility
              </a>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div>© {new Date().getFullYear()} crm1</div>
            <a className="lp-skip" href="#features">
              Skip to content
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
