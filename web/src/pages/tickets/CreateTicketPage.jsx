import React from 'react';
import { Link, useParams } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../state/session.jsx';
import { useToasts } from '../../state/toasts.jsx';
import { createTicket, getPermissions, listContacts, listDeals } from '../../api/crm.js';

const SUBJECT_MAX_LEN = 200;

function validate({ subject, primaryContactId }) {
  const errors = {};
  if (!subject.trim()) errors.subject = 'Subject is required';
  if (subject.trim().length > SUBJECT_MAX_LEN) errors.subject = `Max ${SUBJECT_MAX_LEN} characters`;
  if (!primaryContactId) errors.primaryContactId = 'Primary Contact is required';
  return errors;
}

export default function CreateTicketPage({ subNav }) {
  const { contactId: preselectContactId } = useParams();
  const { workspaceId, actorUserId } = useSession();
  const toasts = useToasts();

  const permsState = useAsync(
    async () => {
      if (!workspaceId) return { permissions: [] };
      if (!actorUserId.trim()) return { permissions: [] };
      return getPermissions(workspaceId, { actorUserId: actorUserId.trim() });
    },
    [workspaceId, actorUserId]
  );

  const permissions = Array.isArray(permsState.data?.permissions) ? permsState.data.permissions : [];
  const allowed = permsState.status === 'success' && permissions.includes('tickets:create') && permissions.includes('contacts:read');

  const contactsState = useAsync(
    () => {
      if (!workspaceId) return [];
      if (!actorUserId.trim()) return [];
      if (!allowed) return [];
      return listContacts(workspaceId, { actorUserId: actorUserId.trim() });
    },
    [workspaceId, actorUserId, allowed]
  );
  const dealsState = useAsync(
    () => {
      if (!workspaceId) return [];
      if (!actorUserId.trim()) return [];
      if (!allowed) return [];
      return listDeals(workspaceId, { actorUserId: actorUserId.trim() });
    },
    [workspaceId, actorUserId, allowed]
  );

  const [subject, setSubject] = React.useState('');
  const [status, setStatus] = React.useState('OPEN');
  const [priority, setPriority] = React.useState('MEDIUM');
  const [primaryContactId, setPrimaryContactId] = React.useState(preselectContactId ?? '');
  const [additionalContactIds, setAdditionalContactIds] = React.useState([]);
  const [dealId, setDealId] = React.useState('');

  const [errors, setErrors] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (preselectContactId) setPrimaryContactId(preselectContactId);
  }, [preselectContactId]);

  if (permsState.status === 'loading' || permsState.status === 'idle') {
    return <ObjectIndexLayout title="New Ticket" subNav={subNav}><div>Validating access…</div></ObjectIndexLayout>;
  }

  if (permsState.status === 'error') {
    return null;
  }
  if (!allowed) {
    return null;
  }

  const contacts = Array.isArray(contactsState.data) ? contactsState.data : [];
  const deals = Array.isArray(dealsState.data) ? dealsState.data : [];

  const currentErrors = validate({ subject, primaryContactId });
  const canSubmit = Object.keys(currentErrors).length === 0 && !isSubmitting && actorUserId.trim();

  return (
    <ObjectIndexLayout title="New Ticket" subNav={subNav}>
      {contactsState.status === 'loading' || contactsState.status === 'idle' ? <div>Loading contacts…</div> : null}
      {contactsState.status === 'error' ? (
        <EmptyState title="Failed to load contacts" description={contactsState.error.message} />
      ) : null}

      {contactsState.status === 'success' ? (
        <form
          className="ui-form ui-max-720"
          onSubmit={async (e) => {
            e.preventDefault();
            const nextErrors = validate({ subject, primaryContactId });
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length) return;
            if (!actorUserId.trim()) return toasts.push('actorUserId is required for writes');

            try {
              setIsSubmitting(true);
              const result = await createTicket(
                workspaceId,
                {
                  subject,
                  status,
                  priority,
                  primaryContactId,
                  additionalContactIds,
                  dealId: dealId || null
                },
                { actorUserId: actorUserId.trim() }
              );

              toasts.push('Ticket created');
              const next = primaryContactId ? `/contacts/${primaryContactId}` : '/tickets';
              // eslint-disable-next-line no-restricted-globals
              location.assign(next);
              return result;
            } catch (err) {
              if (err?.status === 403) {
                toasts.push('Unauthorized');
                // eslint-disable-next-line no-restricted-globals
                location.assign('/tickets');
                return;
              }
              setErrors({ form: err.message ?? 'Failed to create ticket' });
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {errors.form ? <div className="empty">{errors.form}</div> : null}

          <label>
            Subject
            <input
              className="ui-input"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              maxLength={SUBJECT_MAX_LEN}
            />
            {errors.subject ? <div className="ui-error">{errors.subject}</div> : null}
          </label>

          <label>
            Status
            <select className="ui-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="OPEN">OPEN</option>
              <option value="PENDING">PENDING</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>

          <label>
            Priority
            <select className="ui-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </label>

          <label>
            Primary Contact
            <select
              className="ui-select"
              value={primaryContactId}
              onChange={(e) => {
                setPrimaryContactId(e.target.value);
                if (errors.primaryContactId) setErrors((prev) => ({ ...prev, primaryContactId: undefined }));
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {contacts.map((c) => {
                const label = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || c.id;
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            {errors.primaryContactId ? <div className="ui-error">{errors.primaryContactId}</div> : null}
          </label>

          <div>
            <div className="ui-text-xs ui-mb-2">Additional Contacts</div>
            {contacts
              .filter((c) => c.id !== primaryContactId)
              .map((c) => {
                const label = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || c.id;
                const checked = additionalContactIds.includes(c.id);
                return (
                  <label key={c.id} className="ui-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...new Set([...additionalContactIds, c.id])]
                          : additionalContactIds.filter((id) => id !== c.id);
                        setAdditionalContactIds(next);
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            {primaryContactId ? null : <div className="ui-text-xs">Select a primary contact first.</div>}
          </div>

          <label>
            Associated Deal (read-only select)
            <select className="ui-select" value={dealId} onChange={(e) => setDealId(e.target.value)}>
              <option value="">None</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? d.id}
                </option>
              ))}
            </select>
            <div className="ui-help">
              Selecting a deal validates it exists; it does not mutate the deal.
            </div>
          </label>

          <div className="ui-actions-between">
            <Link to="/tickets">Cancel</Link>
            <button type="submit" disabled={!canSubmit}>
              {isSubmitting ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      ) : null}
    </ObjectIndexLayout>
  );
}
