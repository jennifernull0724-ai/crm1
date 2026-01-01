import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listCompanies } from '../../api/crm.js';

export default function CompaniesIndexPage({ subNav }) {
  const { workspaceId } = useSession();
  const state = useAsync(() => listCompanies(workspaceId), [workspaceId]);

  return (
    <ObjectIndexLayout title="Companies" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load companies" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No companies" description="Create a company via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.data.map((c) => (
            <div key={c.id} style={{ border: '1px solid currentColor', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 600 }}>
                <Link to={`/companies/${c.id}`}>{c.name}</Link>
              </div>
              <div style={{ fontSize: 12 }}>{c.domain ?? ''}</div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
