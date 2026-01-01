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

export function listContacts(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/contacts`);
}

export function getContact(workspaceId, contactId) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}`);
}

export function listCompanies(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/companies`);
}

export function getCompany(workspaceId, companyId) {
  return apiFetch(`/workspaces/${workspaceId}/companies/${companyId}`);
}

export function listDeals(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/deals`);
}

export function getDeal(workspaceId, dealId) {
  return apiFetch(`/workspaces/${workspaceId}/deals/${dealId}`);
}

export function listTickets(workspaceId) {
  return apiFetch(`/workspaces/${workspaceId}/tickets`);
}

export function getTicket(workspaceId, ticketId) {
  return apiFetch(`/workspaces/${workspaceId}/tickets/${ticketId}`);
}

export function createTicket(workspaceId, body, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/tickets`, {
    method: 'POST',
    body: { ...body, actorUserId }
  });
}

export function getContactAssociatedTickets(workspaceId, contactId) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/associated-tickets`);
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

export function listActivities(workspaceId, contactId, { limit, cursor } = {}) {
  const qs = new URLSearchParams();
  if (typeof limit === 'number') qs.set('limit', String(limit));
  if (typeof cursor === 'string' && cursor) qs.set('cursor', cursor);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/activities${suffix}`);
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

export function associateCompany(workspaceId, contactId, companyId, { role }, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${contactId}/companies/${companyId}`, {
    method: 'POST',
    body: { role, actorUserId }
  });
}

export function mergeContacts(workspaceId, primaryContactId, mergeContactId, { actorUserId }) {
  return apiFetch(`/workspaces/${workspaceId}/contacts/${primaryContactId}/merge`, {
    method: 'POST',
    body: { mergeContactId, actorUserId }
  });
}
