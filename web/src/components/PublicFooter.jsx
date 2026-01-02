import React from 'react';

export default function PublicFooter() {
  return (
    <footer className="mk-footer" aria-label="Footer">
      <div className="mk-container mk-footer-inner">
        <div className="mk-footer-left">
          <div className="mk-footer-brand">T-REX</div>
          <div className="mk-footer-tagline">Control system for regulated operations.</div>
        </div>

        <nav className="mk-footer-right" aria-label="Footer links">
          <a href="/pricing" className="mk-footer-link">Pricing</a>
          <a href="/security" className="mk-footer-link">Security</a>
          <a href="/privacy" className="mk-footer-link">Privacy</a>
          <a href="/terms" className="mk-footer-link">Terms</a>
          <a href="/contact-support" className="mk-footer-link">Contact Support</a>
        </nav>
      </div>
    </footer>
  );
}
