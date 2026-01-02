import React from 'react';

export default function RecordPageLayout({ title, subNav, actions, main, side }) {
  return (
    <div>
      {subNav}
      <div className="page">
        <div className="ui-row-baseline">
          <h1 className="ui-title">{title}</h1>
          {actions ? <div className="ui-row">{actions}</div> : null}
        </div>
        <div className="record-grid">
          <div>{main}</div>
          <div>{side}</div>
        </div>
      </div>
    </div>
  );
}
