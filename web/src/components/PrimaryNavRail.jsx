import React from 'react';
import { NavLink } from 'react-router-dom';

export default function PrimaryNavRail({ items }) {
  return (
    <nav className="nav-rail" aria-label="Primary">
      <div className="ui-stack-sm">
        {items
          .filter((i) => i.visible)
          .map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
            >
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
