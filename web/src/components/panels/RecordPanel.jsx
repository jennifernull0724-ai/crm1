import React from 'react';
import SidePanelLayout from '../../layouts/SidePanelLayout.jsx';

export default function RecordPanel({ title = 'Record', children, footer }) {
  return (
    <SidePanelLayout title={title} footer={footer}>
      {children}
    </SidePanelLayout>
  );
}
