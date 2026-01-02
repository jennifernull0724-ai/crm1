import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listTickets } from '../../api/crm.js';

export default function TicketsIndexPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();
  const state = useAsync(() => listTickets(workspaceId, { actorUserId: actorUserId.trim() }), [workspaceId, actorUserId]);

  return (
    <ObjectIndexLayout title="Tickets" subNav={subNav}>
      <div className="ui-mb-3">
        <Link to="/tickets/new">New ticket</Link>
      </div>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load tickets" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No tickets" description="Create a ticket to get started." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div className="ui-stack-sm">
          {state.data.map((t) => (
            <div key={t.id} className="card card-sm">
              <div className="timeline-strong">
                <Link to={`/tickets/${t.id}`}>{t.subject}</Link>
              </div>
              <div className="ui-text-xs">{t.status} • {t.priority}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
