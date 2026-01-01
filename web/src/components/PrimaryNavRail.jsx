import React from 'react';
import { NavLink } from 'react-router-dom';

export default function PrimaryNavRail({ items }) {
  return (
    <nav className="nav-rail" aria-label="Primary">
      <div style={{ display: 'grid' }}>
        {items
          .filter((i) => i.visible)
          .map((i) => (
            <NavLink key={i.to} to={i.to} className="nav-item">
              <span className="nav-icon" aria-hidden="true">
                {i.icon}
              </span>
              <span>{i.label}</span>
            </NavLink>
          ))}
      </div>
    </nav>
  );
}
