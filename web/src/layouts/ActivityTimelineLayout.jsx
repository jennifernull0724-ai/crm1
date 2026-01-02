import React from 'react';

export default function ActivityTimelineLayout({ title, timeline }) {
  return (
    <div className="card card-sm">
      <h2 className="ui-h2">{title}</h2>
      <div className="ui-mt-3">{timeline}</div>
    </div>
  );
}
