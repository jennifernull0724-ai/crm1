import React from 'react';

export default function SidePanelLayout({ title, children, footer }) {
  return (
    <div style={{ border: '1px solid currentColor', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
      {footer ? <div style={{ marginTop: 12 }}>{footer}</div> : null}
    </div>
  );
}
