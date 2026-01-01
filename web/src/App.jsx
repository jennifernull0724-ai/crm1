import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';

import { ToastProvider, ToastViewport, useToasts } from './state/toasts.jsx';
import { ModalProvider, ModalRoot, useModals } from './state/modals.jsx';
import { SessionProvider, useSession } from './state/session.jsx';
import { useAsync } from './hooks/useAsync.js';

import { getWorkspace, listWorkspaces, listContacts, listCompanies, listDeals, listTickets } from './api/crm.js';

import AppLayout from './layouts/AppLayout.jsx';
import PrimaryNavRail from './components/PrimaryNavRail.jsx';
import ObjectSubNav from './components/ObjectSubNav.jsx';
import EmptyState from './components/EmptyState.jsx';

import ContactsIndexPage from './pages/contacts/ContactsIndexPage.jsx';
import ContactRecordPage from './pages/contacts/ContactRecordPage.jsx';
import CompaniesIndexPage from './pages/companies/CompaniesIndexPage.jsx';
import CompanyRecordPage from './pages/companies/CompanyRecordPage.jsx';
import DealsIndexPage from './pages/deals/DealsIndexPage.jsx';
import DealRecordPage from './pages/deals/DealRecordPage.jsx';
import TicketsIndexPage from './pages/tickets/TicketsIndexPage.jsx';
import TicketRecordPage from './pages/tickets/TicketRecordPage.jsx';

function Shell({ children }) {
  const { toasts, remove } = useToasts();
  const { modal, close } = useModals();

  return (
    <>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
      <ModalRoot modal={modal} onClose={close} />
    </>
  );
}

function WorkspaceGate() {
  const { workspaceId, setWorkspaceId, actorUserId, setActorUserId } = useSession();
  const workspacesState = useAsync(() => listWorkspaces(), []);

  useEffect(() => {
    if (workspacesState.status !== 'success') return;
    const workspaces = Array.isArray(workspacesState.data) ? workspacesState.data : [];
    if (!workspaceId && workspaces.length === 1) {
      setWorkspaceId(workspaces[0].id);
    }
  }, [workspacesState.status, workspacesState.data, workspaceId, setWorkspaceId]);

  if (workspacesState.status === 'loading' || workspacesState.status === 'idle') {
    return <div className="page">Loading…</div>;
  }

  if (workspacesState.status === 'error') {
    return <div className="page"><EmptyState title="Unable to load workspaces" description={workspacesState.error.message} /></div>;
  }

  const workspaces = Array.isArray(workspacesState.data) ? workspacesState.data : [];

  if (workspaces.length === 0) {
    return <div className="page"><EmptyState title="No workspaces" description="Create a workspace via API first." /></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>Select workspace</h1>
      <div style={{ display: 'grid', gap: 10 }}>
        <label>
          Actor User ID (required for writes)
          <input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} style={{ width: '100%' }} />
        </label>

        <label>
          Workspace
          <select value={workspaceId ?? ''} onChange={(e) => setWorkspaceId(e.target.value)} style={{ width: '100%' }}>
            <option value="" disabled>
              Choose…
            </option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.id})
              </option>
            ))}
          </select>
        </label>

        {workspaceId ? <div className="empty">Workspace selected.</div> : null}
      </div>
    </div>
  );
}

function useAccess(workspaceId) {
  return useAsync(async () => {
    if (!workspaceId) return null;
    await getWorkspace(workspaceId);

    const results = await Promise.allSettled([
      listContacts(workspaceId),
      listCompanies(workspaceId),
      listDeals(workspaceId),
      listTickets(workspaceId)
    ]);

    const allowed = (r) => r.status === 'fulfilled';

    return {
      contacts: allowed(results[0]),
      companies: allowed(results[1]),
      deals: allowed(results[2]),
      tickets: allowed(results[3])
    };
  }, [workspaceId]);
}

function Guarded({ allowed, access, children }) {
  if (!allowed) return <FirstAllowedRedirect access={access} />;
  return children;
}

function FirstAllowedRedirect({ access }) {
  const first = access?.contacts
    ? '/contacts'
    : access?.companies
      ? '/companies'
      : access?.deals
        ? '/deals'
        : access?.tickets
          ? '/tickets'
          : '/contacts';

  return <Navigate to={first} replace />;
}

function ShellRoutes() {
  const { workspaceId, setWorkspaceId, actorUserId, setActorUserId } = useSession();
  const accessState = useAccess(workspaceId);
  const workspacesState = useAsync(() => listWorkspaces(), []);

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
      <div style={{ fontWeight: 700 }}>crm1</div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Workspace
          <select
            value={workspaceId ?? ''}
            onChange={(e) => setWorkspaceId(e.target.value || null)}
            style={{ width: 360 }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {(workspacesState.status === 'success' && Array.isArray(workspacesState.data) ? workspacesState.data : []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.id})
              </option>
            ))}
          </select>
        </label>
        <label>
          Actor
          <input value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} style={{ width: 180 }} />
        </label>
      </div>
    </div>
  );

  if (!workspaceId) {
    return <WorkspaceGate />;
  }

  if (accessState.status === 'loading' || accessState.status === 'idle') {
    return <div className="page">Validating access…</div>;
  }

  if (accessState.status === 'error') {
    return <div className="page"><EmptyState title="Unauthorized" description={accessState.error.message} /></div>;
  }

  const access = accessState.data;

  const navItems = [
    { to: '/contacts', label: 'Contacts', icon: 'C', visible: access.contacts },
    { to: '/companies', label: 'Companies', icon: 'O', visible: access.companies },
    { to: '/deals', label: 'Deals', icon: 'D', visible: access.deals },
    { to: '/tickets', label: 'Tickets', icon: 'T', visible: access.tickets }
  ];

  const subNav = <ObjectSubNav items={navItems} />;

  return (
    <AppLayout header={header} nav={<PrimaryNavRail items={navItems} />}>
      <Routes>
        <Route
          path="/contacts"
          element={
            <Guarded allowed={access.contacts} access={access}>
              <ContactsIndexPage subNav={subNav} />
            </Guarded>
          }
        />
        <Route
          path="/contacts/:contactId"
          element={
            <Guarded allowed={access.contacts} access={access}>
              <ContactRecordPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/companies"
          element={
            <Guarded allowed={access.companies} access={access}>
              <CompaniesIndexPage subNav={subNav} />
            </Guarded>
          }
        />
        <Route
          path="/companies/:companyId"
          element={
            <Guarded allowed={access.companies} access={access}>
              <CompanyRecordPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/deals"
          element={
            <Guarded allowed={access.deals} access={access}>
              <DealsIndexPage subNav={subNav} />
            </Guarded>
          }
        />
        <Route
          path="/deals/:dealId"
          element={
            <Guarded allowed={access.deals} access={access}>
              <DealRecordPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/tickets"
          element={
            <Guarded allowed={access.tickets} access={access}>
              <TicketsIndexPage subNav={subNav} />
            </Guarded>
          }
        />
        <Route
          path="/tickets/:ticketId"
          element={
            <Guarded allowed={access.tickets} access={access}>
              <TicketRecordPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route path="*" element={<FirstAllowedRedirect access={access} />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <SessionProvider>
          <Shell>
            <ShellRoutes />
          </Shell>
        </SessionProvider>
      </ModalProvider>
    </ToastProvider>
  );
}
