import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listContacts } from '../../api/crm.js';

export default function ContactsIndexPage({ subNav }) {
  const { workspaceId } = useSession();
  const state = useAsync(() => listContacts(workspaceId), [workspaceId]);

  return (
    <ObjectIndexLayout title="Contacts" subNav={subNav}>
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load contacts" description={state.error.message} /> : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length === 0 ? (
        <EmptyState title="No contacts" description="Create a contact via API first." />
      ) : null}
      {state.status === 'success' && Array.isArray(state.data) && state.data.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {state.data.map((c) => (
            <div key={c.id} style={{ border: '1px solid currentColor', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    <Link to={`/contacts/${c.id}`}>{c.firstName ?? ''} {c.lastName ?? ''}</Link>
                  </div>
                  <div style={{ fontSize: 12 }}>{c.email ?? ''}</div>
                </div>
                <div style={{ fontSize: 12 }}>{c.archivedAt ? 'archived' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ObjectIndexLayout>
  );
}
