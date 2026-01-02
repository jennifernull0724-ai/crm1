import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listCompanies } from '../../api/crm.js';

export default function CompaniesIndexPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();
  const state = useAsync(() => listCompanies(workspaceId, { actorUserId: actorUserId.trim() }), [workspaceId, actorUserId]);

  return (
    <ObjectIndexLayout title="Companies" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load companies" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No companies" description="Create a company via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div className="ui-stack-sm">
          {state.data.map((c) => (
            <div key={c.id} className="card">
              <div className="timeline-strong">
                <Link to={`/companies/${c.id}`}>{c.name}</Link>
              </div>
              <div className="ui-text-xs">{c.domain ?? ''}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
