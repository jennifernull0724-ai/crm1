import React from 'react';
import PublicHeader from './PublicHeader.jsx';
import PublicFooter from './PublicFooter.jsx';

export default function PublicLayout({ children }) {
  return (
    <div className="mk">
      <PublicHeader />
      <main className="mk-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
