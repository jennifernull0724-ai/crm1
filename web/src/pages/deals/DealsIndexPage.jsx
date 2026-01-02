import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listDeals } from '../../api/crm.js';

export default function DealsIndexPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();
  const state = useAsync(() => listDeals(workspaceId, { actorUserId: actorUserId.trim() }), [workspaceId, actorUserId]);

  return (
    <ObjectIndexLayout title="Deals" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load deals" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No deals" description="Create a deal via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div className="ui-stack-sm">
          {state.data.map((d) => (
            <div key={d.id} className="card card-sm">
              <div className="timeline-strong">
                <Link to={`/deals/${d.id}`}>{d.name}</Link>
              </div>
              <div className="ui-text-xs">{d.status}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
