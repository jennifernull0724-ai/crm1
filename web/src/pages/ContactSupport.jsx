import React, { useMemo, useState } from 'react';
import PublicLayout from '../components/PublicLayout.jsx';

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactSupport() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && isEmail(email) && message.trim().length > 0;
  }, [name, email, message]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || status === 'submitting') return;

    setStatus('submitting');
    setError(null);

    try {
      const res = await fetch('/api/contact-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send');

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err);
    }
  }

  return (
    <PublicLayout>
      <section className="mk-section-white" aria-label="Contact Support">
        <div className="mk-container">
          <h1 className="mk-section-title">Contact Support</h1>
          <p className="mk-section-body">Submit a support request for review.</p>

          <div className="mk-contact-panel">
            <form className="ui-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label>
                Email
                <input className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>

              <label>
                Message
                <textarea className="ui-textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>

              {status === 'error' ? <div className="ui-error">{error?.message ?? 'Failed to send'}</div> : null}
              {status === 'success' ? <div className="mk-contact-success">Submitted.</div> : null}

              <div className="ui-actions">
                <button type="submit" disabled={!canSubmit || status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
