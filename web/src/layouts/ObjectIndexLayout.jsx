import React from 'react';

export default function ObjectIndexLayout({ title, subNav, children }) {
  return (
    <div>
      {subNav}
      <div className="page">
        <h1 className="ui-page-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
