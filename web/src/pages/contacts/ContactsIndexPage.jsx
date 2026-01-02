import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listContacts } from '../../api/crm.js';

export default function ContactsIndexPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();
  const state = useAsync(() => listContacts(workspaceId, { actorUserId: actorUserId.trim() }), [workspaceId, actorUserId]);

  return (
    <ObjectIndexLayout title="Contacts" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load contacts" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No contacts" description="Create a contact via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div className="ui-stack-sm">
          {state.data.map((c) => (
            <div key={c.id} className="card">
              <div className="ui-row-between">
                <div>
                  <div className="timeline-strong">
                    <Link to={`/contacts/${c.id}`}>{c.firstName ?? ''} {c.lastName ?? ''}</Link>
                  </div>
                  <div className="ui-text-xs">{c.email ?? ''}</div>
                </div>
                <div className="ui-text-xs">{c.archivedAt ? 'archived' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
