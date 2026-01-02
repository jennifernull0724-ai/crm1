import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function sliceRoute(text, needle) {
  const start = text.indexOf(needle);
  if (start < 0) return null;
  const next = text.indexOf('\napp.', start + 1);
  return next > start ? text.slice(start, next) : text.slice(start);
}

function assertRequireReadScopeExists(text) {
  if (!/function\s+requireReadScope\s*\(/.test(text)) {
    fail('Phase 19 guard failed: requireReadScope(resource) is missing');
  }

  const fn = sliceRoute(text, 'function requireReadScope');
  if (!fn) {
    fail('Phase 19 guard failed: unable to locate requireReadScope body');
  }

  if (!/res\.status\(403\)\.end\(\)/.test(fn)) {
    fail('Phase 19 guard failed: requireReadScope must deny with res.status(403).end() (no response body)');
  }
}

function assertRouteGuarded(text, { route, requires }) {
  const slice = sliceRoute(text, `app.get('${route}'`);
  if (!slice) {
    fail(`Phase 19 guard failed: missing GET route: ${route}`);
  }

  const guardIndex = slice.search(/\brequire(ReadScope|ReportReadAccess)\b/);
  if (guardIndex < 0) {
    fail(`Phase 19 guard failed: missing read guard in GET ${route}`);
  }

  const prismaIndex = slice.search(/\bprisma\./);
  if (prismaIndex >= 0 && guardIndex > prismaIndex) {
    fail(`Phase 19 guard failed: read guard must run before any prisma call in GET ${route}`);
  }

  if (requires) {
    if (!slice.includes(requires)) {
      fail(`Phase 19 guard failed: GET ${route} must enforce ${requires}`);
    }
  }
}

function assertNoPlaceholderDemoStrings() {
  const roots = [
    path.resolve(process.cwd(), 'web/src')
  ];

  const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!exts.has(path.extname(ent.name))) continue;
      const content = readText(full).toLowerCase();
      if (content.includes('placeholder')) {
        fail(`Phase 19 guard failed: placeholder string found (${path.relative(process.cwd(), full)})`);
      }
      if (content.includes('demo')) {
        fail(`Phase 19 guard failed: demo string found (${path.relative(process.cwd(), full)})`);
      }
    }
  }

  for (const root of roots) {
    if (fs.existsSync(root)) walk(root);
  }
}

const serverPath = path.resolve(process.cwd(), 'src/server.js');
const serverText = readText(serverPath);

assertRequireReadScopeExists(serverText);

// Contacts
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts', requires: "resource: 'contacts'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts/:contactId', requires: "resource: 'contacts'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts/:contactId/timeline', requires: "resource: 'contacts'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts/:contactId/activities', requires: "resource: 'contacts'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contact-properties', requires: "resource: 'contacts'" });

// Companies
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/companies', requires: "resource: 'companies'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/companies/:companyId', requires: "resource: 'companies'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts/:contactId/companies', requires: "resource: 'companies'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/companies/:companyId/contacts', requires: "resource: 'companies'" });

// Deals
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/deals', requires: "resource: 'deals'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/deals/:dealId', requires: "resource: 'deals'" });

// Tickets
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/tickets', requires: "resource: 'tickets'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/tickets/:ticketId', requires: "resource: 'tickets'" });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/contacts/:contactId/associated-tickets', requires: "resource: 'tickets'" });

// Reports must require report read.
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/contacts/activity', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/deals/velocity', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/tickets/sla', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/associations/coverage', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/companies/activity-volume', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/companies/last-activity', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/companies/activity-mix', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/companies/contact-coverage', requires: 'requireReportReadAccess' });
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/reports/companies/growth', requires: 'requireReportReadAccess' });

// Automation views
assertRouteGuarded(serverText, { route: '/workspaces/:workspaceId/workflows', requires: "resource: 'automation'" });

assertNoPlaceholderDemoStrings();

// eslint-disable-next-line no-console
console.log('Phase 19 guards: OK');
