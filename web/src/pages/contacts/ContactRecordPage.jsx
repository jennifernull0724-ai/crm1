import React from 'react';
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
import { associateCompany, getContact, listActivities, listCompanies, logNote, mergeContacts, updateContact } from '../../api/crm.js';

import EditPropertiesPanel from '../../components/panels/EditPropertiesPanel.jsx';
import LogActivityPanel from '../../components/panels/LogActivityPanel.jsx';
import AssociationPickerModal from '../../components/modals/AssociationPickerModal.jsx';
import MergeRecordsModal from '../../components/modals/MergeRecordsModal.jsx';

export default function ContactRecordPage({ subNav }) {
  const { contactId } = useParams();
  const { workspaceId, actorUserId } = useSession();
  const toasts = useToasts();
  const modals = useModals();

  const contactState = useAsync(() => getContact(workspaceId, contactId), [workspaceId, contactId]);
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
      const res = await listActivities(workspaceId, contactId, { limit: 50, cursor });
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
  }, [workspaceId, contactId]);

  React.useEffect(() => {
    loadActivitiesPage({ cursor: null });
  }, [loadActivitiesPage]);

  const companiesState = useAsync(() => listCompanies(workspaceId), [workspaceId]);

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
          <div style={{ display: 'grid', gap: 10 }}>
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
        <dl style={{ margin: 0, display: 'grid', gap: 6 }}>
          <div>
            <dt style={{ fontSize: 12 }}>Email</dt>
            <dd style={{ margin: 0 }}>{contactState.data.email ?? ''}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12 }}>Created</dt>
            <dd style={{ margin: 0 }}>{new Date(contactState.data.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12 }}>Archived</dt>
            <dd style={{ margin: 0 }}>{contactState.data.archivedAt ? new Date(contactState.data.archivedAt).toLocaleString() : ''}</dd>
          </div>
        </dl>
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
              onSubmit={async ({ companyId, role }) => {
                await associateCompany(workspaceId, contactId, companyId, { role }, { actorUserId: actorUserId.trim() });
                toasts.push('Associated');
                modals.close();
                loadActivitiesPage({ cursor: null });
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
