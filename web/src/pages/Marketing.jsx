import React from 'react';
import PublicLayout from '../components/PublicLayout.jsx';

function Hero() {
  return (
    <section className="mk-hero-full" aria-label="Hero">
      <img
        src="/useforhero.png"
        alt=""
        className="mk-hero-bg"
        loading="eager"
        decoding="async"
        fetchpriority="high"
        width="2400"
        height="1350"
      />
      <div className="mk-hero-overlay" aria-hidden="true" />
      <div className="mk-hero-content">
        <div className="mk-container">
          <div className="mk-hero-copy">
            <h1 className="mk-hero-title">Operational control for construction, railroad, and environmental teams.</h1>
            <p className="mk-hero-subtitle">
              CRM, estimating, dispatch, and compliance—built for regulated work and real execution. Every workflow is enforced
              server-side; every action is logged.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OperationalCoverage() {
  return (
    <section className="mk-ops" aria-label="Operational Coverage">
      <div className="mk-container">
        <header className="mk-ops-head">
          <div className="mk-ops-kicker">OPERATIONAL COVERAGE</div>
          <h2 className="mk-ops-title">One operating record spans CRM, estimating, dispatch, and compliance.</h2>
          <p className="mk-ops-lede">
            Scope is defined as record coverage across CRM, estimating, dispatch, and compliance.
          </p>
        </header>

        <div className="mk-ops-grid" role="list" aria-label="Operational Coverage cards">
          <article className="mk-ops-card" role="listitem">
            <h3 className="mk-ops-card-title">CRM</h3>
            <p className="mk-ops-card-body">Contacts, companies, and deals stay on one record.</p>
            <p className="mk-ops-card-body">Ownership, notes, and documents remain accountable.</p>
          </article>

          <article className="mk-ops-card" role="listitem">
            <h3 className="mk-ops-card-title">Estimating</h3>
            <p className="mk-ops-card-body">Controlled presets and revisions document every change.</p>
            <p className="mk-ops-card-body">Approvals, signatures, and PDFs stay versioned.</p>
          </article>

          <article className="mk-ops-card" role="listitem">
            <h3 className="mk-ops-card-title">Dispatch</h3>
            <p className="mk-ops-card-body">Work orders inherit context from CRM and estimating.</p>
            <p className="mk-ops-card-body">Crews, equipment, and execution logs stay traceable.</p>
          </article>

          <article className="mk-ops-card" role="listitem">
            <h3 className="mk-ops-card-title">Compliance</h3>
            <p className="mk-ops-card-body">Certifications, QR verification, and snapshots are immutable.</p>
            <p className="mk-ops-card-body">Audit history mirrors the field reality in one place.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function OperatingCharter() {
  return (
    <section className="mk-charter">
      <div className="mk-container">
        <div className="mk-charter-grid">
          <div className="mk-charter-primary">
            <h2 className="mk-section-title">Operating charter</h2>
            <p className="mk-section-body">T-REX operates as authoritative record infrastructure for organizations requiring centralized customer data control.</p>
            <p className="mk-section-body">Designed to enforce consistency, maintain audit integrity, and provide role-based access across organizational boundaries.</p>
          </div>
          <div className="mk-charter-boundary">
            <div className="mk-boundary-block">
              <h3 className="mk-boundary-title">Designed to support</h3>
              <ul className="mk-boundary-list">
                <li>Centralized customer record authority</li>
                <li>Cross-functional access control</li>
                <li>Entity relationship enforcement</li>
                <li>Audit-compliant change tracking</li>
                <li>Organizational data governance</li>
              </ul>
            </div>
            <div className="mk-boundary-block">
              <h3 className="mk-boundary-title">Explicitly excluded</h3>
              <ul className="mk-boundary-list">
                <li>Marketing campaign automation</li>
                <li>Workflow orchestration platforms</li>
                <li>External integration marketplaces</li>
                <li>Self-service provisioning</li>
                <li>General-purpose warehousing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section className="mk-pricing-preview" aria-label="Pricing preview">
      <div className="mk-container">
        <div className="mk-pricing-preview-grid">
          <div className="mk-pricing-preview-left">
            <h2 className="mk-pricing-preview-title">View pricing plans</h2>
            <p className="mk-pricing-preview-body">T-REX is licensed annually, with access provisioned by approval.</p>
          </div>
          <div className="mk-pricing-preview-right">
            <a href="/pricing" className="mk-pricing-preview-link">View pricing →</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Marketing() {
  return (
    <PublicLayout>
      <Hero />
      <OperationalCoverage />
      <OperatingCharter />
      <PricingPreview />
    </PublicLayout>
  );
}
