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
    <form onSubmit={handleSubmit} className="ui-form">
      <h2 className="ui-h2">Log Activity</h2>

      <label>
        Note
        <textarea className="ui-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error ? <div className="empty">{error}</div> : null}

      <div className="ui-actions">
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
