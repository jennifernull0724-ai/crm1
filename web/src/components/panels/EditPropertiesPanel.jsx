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
    <form onSubmit={handleSubmit} className="ui-form">
      <h2 className="ui-h2">Edit Properties</h2>

      <label>
        Email
        <input className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        First name
        <input className="ui-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </label>
      <label>
        Last name
        <input className="ui-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div className="ui-actions">
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
