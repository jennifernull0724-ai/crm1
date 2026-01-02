import React from 'react';

export default function SidePanelLayout({ title, children, footer }) {
  return (
    <div className="card card-sm">
      <div className="ui-row-baseline">
        <h2 className="ui-h2">{title}</h2>
      </div>
      <div className="ui-mt-3">{children}</div>
      {footer ? <div className="ui-mt-3">{footer}</div> : null}
    </div>
  );
}
