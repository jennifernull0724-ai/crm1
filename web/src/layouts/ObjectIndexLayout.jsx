import React from 'react';

export default function ObjectIndexLayout({ title, subNav, children }) {
  return (
    <div>
      {subNav}
      <div className="page">
        <h1 style={{ margin: '0 0 12px 0' }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
