import React from 'react';

function formatDateTime(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function dateKey(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function subtypeIcon(subtype) {
  if (subtype === 'contact') return 'C';
  if (subtype === 'task') return '✓';
  if (subtype === 'note') return 'N';
  if (subtype === 'email') return 'E';
  if (subtype === 'call') return 'L';
  if (subtype === 'meeting') return 'M';
  return '•';
}

export default function ActivityTimeline({ activities }) {
  const list = Array.isArray(activities) ? activities : [];

  if (list.length === 0) {
    return <div className="empty">No activity yet.</div>;
  }

  const sorted = [...list].sort((a, b) => {
    const ao = new Date(a.occurredAt).getTime();
    const bo = new Date(b.occurredAt).getTime();
    if (bo !== ao) return bo - ao;
    const ac = new Date(a.createdAt).getTime();
    const bc = new Date(b.createdAt).getTime();
    if (bc !== ac) return bc - ac;
    return String(b.id).localeCompare(String(a.id));
  });

  const groups = [];
  for (const a of sorted) {
    const key = dateKey(a.occurredAt);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({ key, items: [a] });
    else last.items.push(a);
  }

  return (
    <div className="timeline">
      {groups.map((g) => (
        <div key={g.key} className="timeline-group">
          <div className="timeline-date">{g.key}</div>
          {g.items.map((a) => (
            <div key={a.id} className="timeline-item">
              <div className="timeline-top">
                <div className="timeline-type">
                  <span aria-hidden="true" className="timeline-icon">
                    {subtypeIcon(a.subtype)}
                  </span>
                  <div className="timeline-strong">{a.type}</div>
                </div>
                <div className="timeline-meta">{formatDateTime(a.occurredAt)}</div>
              </div>
              <div className="timeline-actor">actor: {a.actorUserId}</div>
              <details className="timeline-details">
                <summary>payload</summary>
                <pre className="timeline-pre">{JSON.stringify(a.payload ?? null, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
