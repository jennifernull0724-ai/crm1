import React from 'react';

export default function ActivityTimelineLayout({ title, timeline }) {
  return (
    <div style={{ border: '1px solid currentColor', borderRadius: 10, padding: 12 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      <div style={{ marginTop: 10 }}>{timeline}</div>
    </div>
  );
}
