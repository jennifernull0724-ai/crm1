import React from 'react';

export default function AppLayout({ header, nav, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: '48px 1fr', height: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', borderBottom: '1px solid currentColor' }}>
        {header}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', minHeight: 0 }}>
        {nav}
        <div style={{ minWidth: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
