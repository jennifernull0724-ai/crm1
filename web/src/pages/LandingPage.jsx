import React from 'react';
import heroImageUrl from '../assets/hero-atlas.webp';

const primaryCtaLabel = 'Request access';

const trustSignals = [
  'Built for regulated industries',
  'Audit-defensible by design',
  'Used by operators, not marketers',
  'Contacts → Dispatch continuity',
  'Zero speculative features',
];

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
          <a className="lp-brand" href="/" aria-label="T-REX AI OS home">
            T-REX AI OS
          </a>

          <nav className="lp-nav" aria-label="Primary">
            <a className="lp-nav-link" href="#industries">Industries</a>
            <a className="lp-nav-link" href="#capabilities">
              Coverage
            </a>
            <a className="lp-nav-link" href="#security">
              Trust
            </a>
          </nav>

          <div className="lp-header-ctas">
            <ButtonLink href="/signup" variant="primary">
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
              <h1 className="lp-h1">Operational control for regulated field teams.</h1>
              <p className="lp-lede">
                CRM, estimating, dispatch, and compliance with enforced workflows and audit-ready records—built for construction, railroad, and environmental operations.
              </p>
              <div className="lp-hero-ctas">
                <ButtonLink href="/signup" variant="primary">
                  {primaryCtaLabel}
                </ButtonLink>
                <TextLink href="#industries">See industries</TextLink>
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

        {/* Industries */}
        <section className="lp-section" id="industries" aria-label="Industries">
          <div className="lp-container">
            <h2 className="lp-h2">Built for regulated field operations.</h2>
            <div className="lp-grid-3">
              <div className="lp-card">
                <h3 className="lp-h3">Construction</h3>
                <p className="lp-body lp-body-tight" style={{marginBottom: '0.75rem', fontWeight: 500}}>Fragmented workflows, lost documentation, poor visibility.</p>
                <p className="lp-body lp-body-tight">
                  T-REX ties CRM, estimating, and dispatch to the same record so every handoff is documented and auditable.
                </p>
              </div>
              <div className="lp-card">
                <h3 className="lp-h3">Railroad</h3>
                <p className="lp-body lp-body-tight" style={{marginBottom: '0.75rem', fontWeight: 500}}>Authority coordination, compliance pressure, and operational handoffs.</p>
                <p className="lp-body lp-body-tight">
                  Subdivision context, QR verification, and immutable logs keep inspectors, contractors, and owners aligned.
                </p>
              </div>
              <div className="lp-card">
                <h3 className="lp-h3">Environmental</h3>
                <p className="lp-body lp-body-tight" style={{marginBottom: '0.75rem', fontWeight: 500}}>Documentation overload, audit exposure, and reporting burden.</p>
                <p className="lp-body lp-body-tight">
                  Permit-driven workflows and preserved evidence make regulators see one version of the truth.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get (Capabilities, Not Screens) */}
        <section className="lp-section lp-section-alt" id="capabilities" aria-label="Operational coverage">
          <div className="lp-container">
            <h2 className="lp-h2">Operational coverage</h2>
            <p className="lp-body">CRM, estimating, dispatch, and compliance on one enforced system—no spreadsheet workarounds.</p>

            <div className="lp-grid-4">
              <FeatureCard
                icon="link"
                title="CRM"
                description="Contacts, companies, and deals stay on one record. Ownership, notes, and documents remain accountable."
              />
              <FeatureCard
                icon="grid"
                title="Estimating"
                description="Controlled presets and revisions document every change. Approvals, signatures, and PDFs stay versioned."
              />
              <FeatureCard
                icon="spark"
                title="Dispatch"
                description="Work orders inherit context from CRM and estimating. Crews, equipment, and execution logs stay traceable."
              />
              <FeatureCard
                icon="shield"
                title="Compliance"
                description="Certifications, QR verification, and snapshots are immutable. Audit history mirrors the field reality in one place."
              />
            </div>
          </div>
        </section>

        {/* Trust / Credibility */}
        <section className="lp-proof" id="security" aria-label="Trust">
          <div className="lp-container lp-proof-inner">
            <h2 className="lp-h2">Built for audit-defensible operations.</h2>
            <p className="lp-body">Server-enforced workflows and immutable records designed for regulated industries.</p>
            <LogoRow />
            <div className="lp-badges" aria-label="Credibility">
              {trustSignals.map((signal) => (
                <div key={signal} className="lp-badge">{signal}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Flow */}
        <section className="lp-section lp-section-alt" aria-label="Workflow">
          <div className="lp-container">
            <h2 className="lp-h2">Contact → Dispatch → Compliance</h2>
            <p className="lp-body">Every step documented on one record, from first contact to field execution and audit proof.</p>
            <div className="lp-testimonials">
              <div className="lp-quote">
                <p className="lp-quote-text">"Finally, a system that doesn't let field notes disappear into someone's email."</p>
                <div className="lp-quote-meta">Project Manager · Regional Railroad Contractor</div>
              </div>
              <div className="lp-quote">
                <p className="lp-quote-text">"Auditors see the same timeline we do. No more scrambling for documentation."</p>
                <div className="lp-quote-meta">Compliance Director · Environmental Services</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="lp-pricing" id="pricing" aria-label="Pricing">
          <div className="lp-container">
            <h2 className="lp-h2">Deployment options for your operation.</h2>
            <p className="lp-body">Choose the configuration that matches your compliance and scale requirements.</p>

            <div className="lp-grid-3 lp-pricing-grid">
              <div className="lp-pricing-card">
                <div className="lp-plan">Field Team</div>
                <div className="lp-plan-sub">For crews establishing audit-ready workflows from contact to dispatch</div>
                <ButtonLink href="#request" variant="secondary">
                  Request access
                </ButtonLink>
              </div>

              <div className="lp-pricing-card lp-pricing-card-featured" aria-label="Featured plan">
                <div className="lp-plan">Operations</div>
                <div className="lp-plan-sub">For regional teams coordinating CRM, estimating, and compliance</div>
                <ButtonLink href="#request" variant="primary">
                  {primaryCtaLabel}
                </ButtonLink>
              </div>

              <div className="lp-pricing-card">
                <div className="lp-plan">Enterprise</div>
                <div className="lp-plan-sub">For multi-site operations requiring custom enforcement and integrations</div>
                <ButtonLink href="mailto:sales@trexaios.com" variant="secondary">
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
              <h2 className="lp-h2">Deploy with your operations team.</h2>
              <p className="lp-body">Request access to evaluate T-REX with your field workflows. We'll help you confirm compliance fit and rollout approach.</p>
            </div>
            <div className="lp-cta-actions">
              <ButtonLink href="mailto:hello@trexaios.com" variant="primary">
                {primaryCtaLabel}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer" aria-label="Footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">T-REX AI OS</div>

          <div className="lp-footer-cols" role="navigation" aria-label="Footer links">
            <div className="lp-footer-col">
              <div className="lp-footer-title">System</div>
              <a href="#industries">Industries</a>
              <a href="#capabilities">Coverage</a>
              <a href="#security">Trust</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-title">Company</div>
              <a href="#request">Request access</a>
              <a href="mailto:hello@trexaios.com">Contact</a>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-title">Resources</div>
              <a href="#industries">Overview</a>
              <a href="#pricing">Deployment</a>
              <a href="mailto:hello@trexaios.com">Contact sales</a>
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
            <div>© {new Date().getFullYear()} T-REX AI OS</div>
            <a className="lp-skip" href="#industries">
              Skip to content
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
