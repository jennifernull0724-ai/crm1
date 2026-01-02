import React from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';

import RecordPageLayout from '../../layouts/RecordPageLayout.jsx';
import SidePanelLayout from '../../layouts/SidePanelLayout.jsx';
import ActivityTimelineLayout from '../../layouts/ActivityTimelineLayout.jsx';
import ActivityTimeline from '../../components/ActivityTimeline.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import { useSession } from '../../state/session.jsx';
import { useToasts } from '../../state/toasts.jsx';
import { useModals } from '../../state/modals.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import {
  associateCompany,
  disassociateCompany,
  getContact,
  getContactAssociatedCompanies,
  getContactAssociatedTickets,
  listActivities,
  listCompanies,
  logNote,
  mergeContacts,
  updateContactCompanyAssociation,
  updateContact
} from '../../api/crm.js';

import EditPropertiesPanel from '../../components/panels/EditPropertiesPanel.jsx';
import LogActivityPanel from '../../components/panels/LogActivityPanel.jsx';
import AssociationPickerModal from '../../components/modals/AssociationPickerModal.jsx';
import MergeRecordsModal from '../../components/modals/MergeRecordsModal.jsx';

export default function ContactRecordPage({ subNav }) {
  const { contactId } = useParams();
  const { workspaceId, actorUserId } = useSession();
  const toasts = useToasts();
  const modals = useModals();

  const contactState = useAsync(
    () => getContact(workspaceId, contactId, { actorUserId: actorUserId.trim() }),
    [workspaceId, contactId, actorUserId]
  );
  const ticketsState = useAsync(
    () => getContactAssociatedTickets(workspaceId, contactId, { actorUserId: actorUserId.trim() }),
    [workspaceId, contactId, actorUserId]
  );
  const [activityState, setActivityState] = React.useState({ status: 'idle', data: [], error: null });
  const [nextCursor, setNextCursor] = React.useState(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const loadActivitiesPage = React.useCallback(async ({ cursor } = {}) => {
    if (!workspaceId || !contactId) return;

    if (!cursor) {
      setActivityState({ status: 'loading', data: [], error: null });
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await listActivities(workspaceId, contactId, { limit: 50, cursor, actorUserId: actorUserId.trim() });
      const items = Array.isArray(res.activities) ? res.activities : [];

      setActivityState((prev) => ({
        status: 'success',
        data: cursor ? [...(prev.data ?? []), ...items] : items,
        error: null
      }));
      setNextCursor(res.nextCursor ?? null);
    } catch (err) {
      setActivityState((prev) => ({
        status: 'error',
        data: cursor ? (prev.data ?? []) : [],
        error: err
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [workspaceId, contactId, actorUserId]);

  React.useEffect(() => {
    loadActivitiesPage({ cursor: null });
  }, [loadActivitiesPage]);

  const companiesState = useAsync(
    () => listCompanies(workspaceId, { actorUserId: actorUserId.trim() }),
    [workspaceId, actorUserId]
  );
  const [companiesReloadKey, setCompaniesReloadKey] = React.useState(0);
  const contactCompaniesState = useAsync(
    () => getContactAssociatedCompanies(workspaceId, contactId, { actorUserId: actorUserId.trim() }),
    [workspaceId, contactId, companiesReloadKey, actorUserId]
  );

  const [companyEdits, setCompanyEdits] = React.useState({});

  const title = contactState.status === 'success'
    ? `${contactState.data.firstName ?? ''} ${contactState.data.lastName ?? ''}`.trim() || contactState.data.email || contactState.data.id
    : 'Contact';

  const main = (
    <ActivityTimelineLayout
      title="Activity"
      timeline={
        activityState.status === 'loading' || activityState.status === 'idle' ? (
          <div>Loading…</div>
        ) : activityState.status === 'error' ? (
          <EmptyState title="Failed to load activity" description={activityState.error.message} />
        ) : (
          <div className="ui-stack-sm">
            <ActivityTimeline activities={activityState.data} />
            {nextCursor ? (
              <button type="button" onClick={() => loadActivitiesPage({ cursor: nextCursor })} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        )
      }
    />
  );

  const side = (
    <SidePanelLayout title="Record">
      {contactState.status === 'loading' || contactState.status === 'idle' ? <div>Loading…</div> : null}
      {contactState.status === 'error' ? <EmptyState title="Failed to load contact" description={contactState.error.message} /> : null}
      {contactState.status === 'success' ? (
        <div className="ui-stack-lg">
          <dl className="ui-kv">
            <div>
              <dt>Email</dt>
              <dd>{contactState.data.email ?? ''}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(contactState.data.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Archived</dt>
              <dd>{contactState.data.archivedAt ? new Date(contactState.data.archivedAt).toLocaleString() : ''}</dd>
            </div>
          </dl>

          <div>
            <div className="ui-row-baseline">
              <div className="ui-text-xs">Tickets</div>
              <Link to={`/contacts/${contactId}/tickets/new`} className="ui-text-xs">
                New ticket
              </Link>
            </div>

            {ticketsState.status === 'loading' || ticketsState.status === 'idle' ? <div>Loading…</div> : null}
            {ticketsState.status === 'error' ? (
              <EmptyState title="Failed to load tickets" description={ticketsState.error.message} />
            ) : null}
            {ticketsState.status === 'success' && Array.isArray(ticketsState.data?.tickets) && ticketsState.data.tickets.length === 0 ? (
              <div className="ui-text-xs">No tickets</div>
            ) : null}
            {ticketsState.status === 'success' && Array.isArray(ticketsState.data?.tickets) && ticketsState.data.tickets.length > 0 ? (
              <div className="ui-stack-sm">
                {ticketsState.data.tickets.map((row) => (
                  <div key={row.ticket.id} className="ui-row-between">
                    <div>
                      <Link to={`/tickets/${row.ticket.id}`}>{row.ticket.subject ?? row.ticket.id}</Link>
                    </div>
                    <div className="ui-text-xs">{row.role}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className="ui-row-baseline">
              <div className="ui-text-xs">Companies</div>
            </div>

            {contactCompaniesState.status === 'loading' || contactCompaniesState.status === 'idle' ? <div>Loading…</div> : null}
            {contactCompaniesState.status === 'error' ? (
              <EmptyState title="Failed to load companies" description={contactCompaniesState.error.message} />
            ) : null}

            {contactCompaniesState.status === 'success' && Array.isArray(contactCompaniesState.data) && contactCompaniesState.data.length === 0 ? (
              <div className="ui-text-xs">No companies</div>
            ) : null}

            {contactCompaniesState.status === 'success' && Array.isArray(contactCompaniesState.data) && contactCompaniesState.data.length > 0 ? (
              <div className="ui-stack-sm">
                {contactCompaniesState.data.map((row) => {
                  const company = row.company;
                  if (!company) return null;

                  const editKey = company.id;
                  const edit = companyEdits[editKey] ?? { role: row.role, isPrimary: Boolean(row.isPrimary) };

                  return (
                    <div key={company.id} className="card">
                      <div className="ui-row-baseline">
                        <Link to={`/companies/${company.id}`}>{company.name ?? company.id}</Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
                            await disassociateCompany(
                              workspaceId,
                              contactId,
                              company.id,
                              { occurredAt: new Date().toISOString() },
                              { actorUserId: actorUserId.trim() }
                            );
                            toasts.push('Removed');
                            loadActivitiesPage({ cursor: null });
                            setCompaniesReloadKey((n) => n + 1);
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="ui-grid-2 ui-mt-2">
                        <label className="ui-field ui-field-xs">
                          Role
                          <select
                            className="ui-select"
                            value={edit.role}
                            onChange={(e) =>
                              setCompanyEdits((prev) => ({
                                ...prev,
                                [editKey]: { ...edit, role: e.target.value }
                              }))
                            }
                          >
                            <option value="primary">primary</option>
                            <option value="employee">employee</option>
                            <option value="contractor">contractor</option>
                            <option value="other">other</option>
                          </select>
                        </label>

                        <label className="ui-field ui-field-xs">
                          Primary
                          <input
                            type="checkbox"
                            checked={Boolean(edit.isPrimary)}
                            onChange={(e) =>
                              setCompanyEdits((prev) => ({
                                ...prev,
                                [editKey]: { ...edit, isPrimary: e.target.checked }
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="ui-actions ui-mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
                            await updateContactCompanyAssociation(
                              workspaceId,
                              contactId,
                              company.id,
                              { role: edit.role, isPrimary: Boolean(edit.isPrimary), occurredAt: new Date().toISOString() },
                              { actorUserId: actorUserId.trim() }
                            );
                            toasts.push('Updated');
                            loadActivitiesPage({ cursor: null });
                            setCompaniesReloadKey((n) => n + 1);
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </SidePanelLayout>
  );

  const actions = (
    <>
      <button
        type="button"
        onClick={() => {
          if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
          const contact = contactState.status === 'success' ? contactState.data : null;
          if (!contact) return;

          modals.open(
            <EditPropertiesPanel
              initialValues={contact}
              onCancel={() => modals.close()}
              onSubmit={async (patch) => {
                await updateContact(workspaceId, contactId, patch, { actorUserId: actorUserId.trim() });
                toasts.push('Saved');
                modals.close();
                loadActivitiesPage({ cursor: null });
              }}
            />
          );
        }}
        disabled={contactState.status !== 'success'}
      >
        Edit properties
      </button>

      <button
        type="button"
        onClick={() => {
          if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
          modals.open(
            <LogActivityPanel
              onCancel={() => modals.close()}
              onSubmit={async ({ body }) => {
                await logNote(workspaceId, contactId, { body }, { actorUserId: actorUserId.trim() });
                toasts.push('Logged');
                modals.close();
                loadActivitiesPage({ cursor: null });
              }}
            />
          );
        }}
      >
        Log activity
      </button>

      <button
        type="button"
        onClick={() => {
          if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
          if (companiesState.status !== 'success') return toasts.push('Companies not loaded');

          modals.open(
            <AssociationPickerModal
              companies={companiesState.data}
              onCancel={() => modals.close()}
              onSubmit={async ({ companyId, role, isPrimary }) => {
                await associateCompany(
                  workspaceId,
                  contactId,
                  companyId,
                  { role, isPrimary: Boolean(isPrimary), occurredAt: new Date().toISOString() },
                  { actorUserId: actorUserId.trim() }
                );
                toasts.push('Associated');
                modals.close();
                loadActivitiesPage({ cursor: null });
                setCompaniesReloadKey((n) => n + 1);
              }}
            />
          );
        }}
      >
        Associate company
      </button>

      <button
        type="button"
        onClick={() => {
          if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');
          modals.open(
            <MergeRecordsModal
              onCancel={() => modals.close()}
              onSubmit={async ({ mergeContactId }) => {
                await mergeContacts(workspaceId, contactId, mergeContactId, { actorUserId: actorUserId.trim() });
                toasts.push('Merged');
                modals.close();
                loadActivitiesPage({ cursor: null });
              }}
            />
          );
        }}
        disabled={contactState.status !== 'success'}
      >
        Merge
      </button>
    </>
  );

  return <RecordPageLayout title={title} subNav={subNav} actions={actions} main={main} side={side} />;
}
