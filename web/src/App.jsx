import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';

import { ToastProvider, ToastViewport, useToasts } from './state/toasts.jsx';
import { ModalProvider, ModalRoot, useModals } from './state/modals.jsx';
import { SessionProvider, useSession } from './state/session.jsx';
import { useAsync } from './hooks/useAsync.js';

import { getPermissions, listWorkspaces } from './api/crm.js';

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
import CreateTicketPage from './pages/tickets/CreateTicketPage.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import CompanyReportsPage from './pages/reports/CompanyReportsPage.jsx';
import Marketing from './pages/Marketing.jsx';
import Pricing from './pages/Pricing.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import Security from './pages/Security.jsx';
import ContactSupport from './pages/ContactSupport.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';

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
    <div className="page ui-max-720">
      <h1 className="ui-title">Select workspace</h1>
      <div className="ui-form">
        <label>
          Actor User ID (required for writes)
          <input className="ui-input" value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
        </label>

        <label>
          Workspace
          <select className="ui-select" value={workspaceId ?? ''} onChange={(e) => setWorkspaceId(e.target.value)}>
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
  const { actorUserId } = useSession();
  return useAsync(async () => {
    if (!workspaceId) return null;
    if (!actorUserId.trim()) {
      return { permissions: [], contacts: false, companies: false, deals: false, tickets: false, reports: false, automation: false };
    }

    const result = await getPermissions(workspaceId, { actorUserId: actorUserId.trim() });
    const permissions = Array.isArray(result?.permissions) ? result.permissions : [];

    const has = (p) => permissions.includes(p);

    return {
      permissions,
      contacts: has('contacts:read'),
      companies: has('companies:read'),
      deals: has('deals:read'),
      tickets: has('tickets:read'),
      reports: has('reports:read'),
      automation: has('automation:read')
    };
  }, [workspaceId, actorUserId]);
}

function Guarded({ allowed, access, children }) {
  void access;
  if (!allowed) return null;
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
    <div className="ui-row-between">
      <div className="timeline-strong">crm1</div>
      <div className="ui-row">
        <label>
          Workspace
          <select
            className="ui-select ui-w-360"
            value={workspaceId ?? ''}
            onChange={(e) => setWorkspaceId(e.target.value || null)}
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
          Actor User ID (required for reads and writes)
          <input className="ui-input ui-w-180" value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
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
    { to: '/tickets', label: 'Tickets', icon: 'T', visible: access.tickets },
    { to: '/reports', label: 'Reports', icon: 'R', visible: access.reports }
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
          path="/reports"
          element={
            <Guarded allowed={access.reports} access={access}>
              <ReportsPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/reports/companies"
          element={
            <Guarded allowed={access.reports} access={access}>
              <CompanyReportsPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/tickets/new"
          element={
            <Guarded allowed={access.tickets} access={access}>
              <CreateTicketPage subNav={subNav} />
            </Guarded>
          }
        />

        <Route
          path="/contacts/:contactId/tickets/new"
          element={
            <Guarded allowed={access.tickets && access.contacts} access={access}>
              <CreateTicketPage subNav={subNav} />
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
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/security" element={<Security />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact-support" element={<ContactSupport />} />
              <Route path="/*" element={<ShellRoutes />} />
            </Routes>
          </Shell>
        </SessionProvider>
      </ModalProvider>
    </ToastProvider>
  );
}
