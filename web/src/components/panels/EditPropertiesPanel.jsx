import React, { useState } from 'react';

export default function EditPropertiesPanel({ initialValues, onSubmit, onCancel }) {
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
  const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        email: email.trim() ? email.trim() : null,
        firstName: firstName.trim() ? firstName.trim() : null,
        lastName: lastName.trim() ? lastName.trim() : null
      });
    } catch (err) {
      setError(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ marginTop: 0 }}>Edit Properties</h2>

      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        First name
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        Last name
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ width: '100%' }} />
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          Save
        </button>
      </div>
    </form>
  );
}
