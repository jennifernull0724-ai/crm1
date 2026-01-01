import React, { useState } from 'react';

export default function AssociationPickerModal({ companies, onSubmit, onCancel }) {
  const [companyId, setCompanyId] = useState('');
  const [role, setRole] = useState('other');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!companyId) throw new Error('Select a company');
      await onSubmit({ companyId, role });
    } catch (err) {
      setError(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ marginTop: 0 }}>Association Picker</h2>

      <label>
        Company
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={{ width: '100%' }}>
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
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%' }}>
          <option value="primary">primary</option>
          <option value="employee">employee</option>
          <option value="contractor">contractor</option>
          <option value="other">other</option>
        </select>
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
