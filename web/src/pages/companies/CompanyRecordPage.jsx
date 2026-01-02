import React from 'react';
import { useParams } from 'react-router-dom';

import RecordPageLayout from '../../layouts/RecordPageLayout.jsx';
import SidePanelLayout from '../../layouts/SidePanelLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getCompany, getCompanyAssociatedContacts } from '../../api/crm.js';

function Table({ rows, columns, rowKey }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompanyRecordPage({ subNav }) {
  const { companyId } = useParams();
  const { workspaceId, actorUserId } = useSession();

  const state = useAsync(
    () => getCompany(workspaceId, companyId, { actorUserId: actorUserId.trim() }),
    [workspaceId, companyId, actorUserId]
  );
  const contactsState = useAsync(
    () => getCompanyAssociatedContacts(workspaceId, companyId, { actorUserId: actorUserId.trim() }),
    [workspaceId, companyId, actorUserId]
  );

  const title = state.status === 'success' ? state.data.name : 'Company';

  const rows = contactsState.status === 'success' && Array.isArray(contactsState.data) ? contactsState.data : [];

  const main = (
    <div className="ui-stack-lg ui-max-900">
      <section>
        <h2 className="ui-h2">Associated Contacts</h2>
        {contactsState.status === 'loading' || contactsState.status === 'idle' ? <div>Loading…</div> : null}
        {contactsState.status === 'error' ? <EmptyState title="Failed to load" description={contactsState.error.message} /> : null}
        {contactsState.status === 'success' && rows.length === 0 ? (
          <EmptyState title="No contacts" description="No rows returned." />
        ) : null}
        {contactsState.status === 'success' && rows.length ? (
          <Table
            rows={rows}
            rowKey={(r) => r.contact?.id}
            columns={[
              {
                key: 'contact',
                label: 'contact',
                render: (r) => (r.contact?.id ? r.contact.id : '')
              },
              {
                key: 'email',
                label: 'email',
                render: (r) => (r.contact?.email ? String(r.contact.email) : '')
              },
              { key: 'role', label: 'role', render: (r) => String(r.role ?? '') },
              { key: 'isPrimary', label: 'primary', render: (r) => (r.isPrimary ? 'true' : '') }
            ]}
          />
        ) : null}
      </section>

      <section>
        <EmptyState title="No timeline" description="Company history emits to Contact Activities only." />
      </section>
    </div>
  );

  const side = (
    <SidePanelLayout title="Record">
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load company" description={state.error.message} /> : null}
      {state.status === 'success' ? (
        <dl className="ui-kv">
          <div>
            <dt>Domain</dt>
            <dd>{state.data.domain ?? ''}</dd>
          </div>
          <div>
            <dt>Legal name</dt>
            <dd>{state.data.legalName ?? ''}</dd>
          </div>
          <div>
            <dt>Industry</dt>
            <dd>{state.data.industry ?? ''}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{state.data.country ?? ''}</dd>
          </div>
          <div>
            <dt>Region</dt>
            <dd>{state.data.region ?? ''}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(state.data.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      ) : null}
    </SidePanelLayout>
  );

  return <RecordPageLayout title={title} subNav={subNav} main={main} side={side} />;
}
