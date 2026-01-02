import React, { useState } from 'react';

export default function MergeRecordsModal({ onSubmit, onCancel }) {
  const [mergeContactId, setMergeContactId] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!mergeContactId.trim()) throw new Error('mergeContactId is required');
      await onSubmit({ mergeContactId: mergeContactId.trim() });
    } catch (err) {
      setError(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ui-form">
      <h2 className="ui-h2">Merge Records</h2>

      <label>
        Contact ID to merge into this record
        <input className="ui-input" value={mergeContactId} onChange={(e) => setMergeContactId(e.target.value)} />
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div className="ui-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          Merge
        </button>
      </div>
    </form>
  );
}
