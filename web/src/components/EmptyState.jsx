import React from 'react';

export default function EmptyState({ title, description }) {
  return (
    <div className="empty">
      <div className="timeline-strong">{title}</div>
      {description ? <div className="ui-mt-2">{description}</div> : null}
    </div>
  );
}
