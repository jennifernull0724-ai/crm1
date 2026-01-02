import React from 'react';

export default function PublicHeader() {
  return (
    <header className="mk-header" aria-label="Global">
      <div className="mk-header-inner">
        <a className="mk-logo" href="/" aria-label="T-REX home">
          <img className="mk-logo-img" src="/T-REX (1).png" alt="T-REX" width="132" height="32" />
        </a>
        <nav className="mk-nav" aria-label="Primary">
          <a href="/pricing" className="mk-nav-link">Pricing</a>
          <a href="/contact-support" className="mk-nav-link mk-nav-link-secondary">Contact Support</a>
        </nav>
        <div className="mk-header-actions">
          <a href="/login" className="mk-btn mk-btn-login">
            Login
          </a>
        </div>
      </div>
    </header>
  );
}
