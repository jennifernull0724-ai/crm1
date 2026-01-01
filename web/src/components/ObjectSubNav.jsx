import React from 'react';
import { NavLink } from 'react-router-dom';

export default function ObjectSubNav({ items }) {
  return (
    <div className="subnav" aria-label="Objects">
      {items
        .filter((i) => i.visible)
        .map((i) => (
          <NavLink key={i.to} to={i.to} style={{ textDecoration: 'none' }}>
            {i.label}
          </NavLink>
        ))}
    </div>
  );
}
