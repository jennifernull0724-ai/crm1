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
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map((g) => (
        <div key={g.key} style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{g.key}</div>
          {g.items.map((a) => (
            <div key={a.id} style={{ border: '1px solid currentColor', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>
                    {subtypeIcon(a.subtype)}
                  </span>
                  <div style={{ fontWeight: 600 }}>{a.type}</div>
                </div>
                <div style={{ fontSize: 12 }}>{formatDateTime(a.occurredAt)}</div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12 }}>actor: {a.actorUserId}</div>
              <details style={{ marginTop: 8 }}>
                <summary>payload</summary>
                <pre style={{ margin: 0, overflow: 'auto' }}>{JSON.stringify(a.payload ?? null, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
