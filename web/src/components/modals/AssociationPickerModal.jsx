import React, { useState } from 'react';

export default function AssociationPickerModal({ companies, onSubmit, onCancel }) {
  const [companyId, setCompanyId] = useState('');
  const [role, setRole] = useState('other');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!companyId) throw new Error('Select a company');
      await onSubmit({ companyId, role, isPrimary });
    } catch (err) {
      setError(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ui-form">
      <h2 className="ui-h2">Association Picker</h2>

      <label>
        Company
        <select className="ui-select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="" disabled>
            Choose…
          </option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id})
            </option>
          ))}
        </select>
      </label>

      <label>
        Role
        <select className="ui-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="primary">primary</option>
          <option value="employee">employee</option>
          <option value="contractor">contractor</option>
          <option value="other">other</option>
        </select>
      </label>

      <label className="ui-row">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
        Primary
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div className="ui-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          Associate
        </button>
      </div>
    </form>
  );
}
