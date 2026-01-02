import { apiFetch } from './http.js';

export function listWorkspaces() {
  return apiFetch('/workspaces');
}

export function getWorkspace(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}`);
}

export function getPermissions(workspaceId, { actorUserId }) {
  const qs = new URLSearchParams();
  if (typeof actorUserId === 'string' && actorUserId) qs.set('actorUserId', actorUserId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/workspaces/${workspaceId}/permissions${suffix}`);
}

export function listContacts(workspaceId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/contacts`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function getContact(workspaceId, contactId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function listCompanies(workspaceId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/companies`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function getCompany(workspaceId, companyId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/companies/${companyId}`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function updateCompany(workspaceId, companyId, patch, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/companies/${companyId}`, {
    method: 'PATCH',
    body: { ...patch, actorUserId }
  });
}

export function listDeals(workspaceId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/deals`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function getDeal(workspaceId, dealId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/deals/${dealId}`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function listTickets(workspaceId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/tickets`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function getTicket(workspaceId, ticketId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/tickets/${ticketId}`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function createTicket(workspaceId, body, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/tickets`, {
    method: 'POST',
    body: { ...body, actorUserId }
  });
}

export function getContactAssociatedTickets(workspaceId, contactId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/associated-tickets`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportContactActivity(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/contacts/activity`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportDealVelocity(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/deals/velocity`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportTicketSla(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/tickets/sla`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportAssociationCoverage(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/associations/coverage`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportCompanyActivityVolume(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/companies/activity-volume`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportCompanyLastActivity(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/companies/last-activity`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportCompanyActivityMix(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/companies/activity-mix`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportCompanyContactCoverage(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/companies/contact-coverage`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function reportCompanyGrowth(workspaceId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/reports/companies/growth`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function listActivities(workspaceId, contactId, { limit, cursor, actorUserId } = {}) {
  const qs = new URLSearchParams();
  if (typeof limit === 'number') qs.set('limit', String(limit));
  if (typeof cursor === 'string' && cursor) qs.set('cursor', cursor);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/activities${suffix}`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function updateContact(workspaceId, contactId, patch, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}`, {
    method: 'PATCH',
    body: { ...patch, actorUserId }
  });
}

export function logNote(workspaceId, contactId, { body }, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/notes`, {
    method: 'POST',
    body: { body, actorUserId }
  });
}

export function associateCompany(workspaceId, contactId, companyId, { role, isPrimary, occurredAt }, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/companies/${companyId}`, {
    method: 'POST',
    body: { role, isPrimary, occurredAt, actorUserId }
  });
}

export function getContactAssociatedCompanies(workspaceId, contactId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/companies`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function getCompanyAssociatedContacts(workspaceId, companyId, { actorUserId } = {}) {
  return apiFetch(`/workspaces/${workspaceId}/companies/${companyId}/contacts`, {
    headers: { 'x-actor-user-id': actorUserId }
  });
}

export function updateContactCompanyAssociation(workspaceId, contactId, companyId, patch, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/companies/${companyId}`, {
    method: 'PATCH',
    body: { ...patch, actorUserId }
  });
}

export function disassociateCompany(workspaceId, contactId, companyId, { occurredAt }, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/companies/${companyId}`, {
    method: 'DELETE',
    body: { occurredAt, actorUserId }
  });
}

export function mergeContacts(workspaceId, primaryContactId, mergeContactId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${primaryContactId}/merge`, {
    method: 'POST',
    body: { mergeContactId, actorUserId }
  });
}
