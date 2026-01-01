import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listDeals } from '../../api/crm.js';

export default function DealsIndexPage({ subNav }) {
  const { workspaceId } = useSession();
  const state = useAsync(() => listDeals(workspaceId), [workspaceId]);

  return (
    <ObjectIndexLayout title="Deals" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load deals" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No deals" description="Create a deal via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.data.map((d) => (
            <div key={d.id} style={{ border: '1px solid currentColor', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>
                <Link to={`/deals/${d.id}`}>{d.name}</Link>
              </div>
              <div style={{ fontSize: 12 }}>{d.status}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
