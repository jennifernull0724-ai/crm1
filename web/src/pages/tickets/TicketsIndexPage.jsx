import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listTickets } from '../../api/crm.js';

export default function TicketsIndexPage({ subNav }) {
  const { workspaceId } = useSession();
  const state = useAsync(() => listTickets(workspaceId), [workspaceId]);

  return (
    <ObjectIndexLayout title="Tickets" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load tickets" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No tickets" description="Create a ticket via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.data.map((t) => (
            <div key={t.id} style={{ border: '1px solid currentColor', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>
                <Link to={`/tickets/${t.id}`}>{t.subject}</Link>
              </div>
              <div style={{ fontSize: 12 }}>{t.status} • {t.priority}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
