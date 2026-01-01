import React from 'react';

export default function RecordPageLayout({ title, subNav, actions, main, side }) {
  return (
    <div>
      {subNav}
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 12, marginTop: 12 }}>
          <div style={{ minWidth: 0 }}>{main}</div>
          <div style={{ minWidth: 0 }}>{side}</div>
        </div>
      </div>
    </div>
  );
}
