import React from 'react';

export default function AppLayout({ header, nav, children }) {
  return (
    <div className="app-shell">
      <div className="app-topbar">
        {header}
      </div>
      <div className="app-main">
        {nav}
        <div className="app-canvas">{children}</div>
      </div>
    </div>
  );
}
