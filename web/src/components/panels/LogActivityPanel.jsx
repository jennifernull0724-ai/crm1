import React, { useState } from 'react';

export default function LogActivityPanel({ onSubmit, onCancel }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!note.trim()) throw new Error('Note body is required');
      await onSubmit({ body: note });
    } catch (err) {
      setError(err?.message ?? 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ marginTop: 0 }}>Log Activity</h2>

      <label>
        Note
        <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ width: '100%', minHeight: 120 }} />
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          Log
        </button>
      </div>
    </form>
  );
}
