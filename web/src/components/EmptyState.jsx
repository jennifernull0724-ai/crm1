import React from 'react';

export default function EmptyState({ title, description }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 600 }}>{title}</div>
      {description ? <div style={{ marginTop: 6 }}>{description}</div> : null}
    </div>
  );
}
