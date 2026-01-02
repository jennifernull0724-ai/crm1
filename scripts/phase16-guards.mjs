import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' });
}

function assertNoReportWrites() {
  const serverPath = path.resolve(process.cwd(), 'src/server.js');
  const text = readText(serverPath);

  const bad = text.match(/app\.(post|put|patch|delete)\(\s*['"`][^'"`]*\/reports\b/gi);
  if (bad && bad.length) {
    fail(`Phase 16 guard failed: write route(s) found under /reports: ${bad.join(', ')}`);
  }
}

function assertSchemaDiffLimitedToCompanies() {
  const diff = sh('git diff -- prisma/schema.prisma');
  if (!diff.trim()) return;

  const badModelHeader = diff
    .split(/\r?\n/)
    .filter((l) => (l.startsWith('+model ') || l.startsWith('-model ')))
    .filter((l) => !l.includes('model Company') && !l.includes('model ContactCompanyAssociation'));

  if (badModelHeader.length) {
    fail(`Phase 16 guard failed: schema changes outside Company/ContactCompanyAssociation detected: ${badModelHeader.join(' | ')}`);
  }

  const forbidden = diff.match(/^[+-].*\b(Activity|Deal|Ticket|Report|Automation)\b/m);
  if (forbidden) {
    fail('Phase 16 guard failed: schema diff mentions non-company domain types (heuristic)');
  }
}

function assertMigrationsLimitedToPhase16Folder() {
  const changed = sh('git diff --name-only -- prisma/migrations').trim().split(/\r?\n/).filter(Boolean);
  if (!changed.length) return;

  const allowedPrefix = 'prisma/migrations/20260101000001_phase16_companies_firmographic/';
  const illegal = changed.filter((p) => !p.startsWith(allowedPrefix));
  if (illegal.length) {
    fail(`Phase 16 guard failed: unexpected migration file changes: ${illegal.join(', ')}`);
  }
}

function assertNoCompanyTimelineUI() {
  const companyPage = path.resolve(process.cwd(), 'web/src/pages/companies/CompanyRecordPage.jsx');
  if (!fs.existsSync(companyPage)) return;

  const text = readText(companyPage);
  if (/ActivityTimeline\b/.test(text)) {
    fail('Phase 16 guard failed: CompanyRecordPage references ActivityTimeline (companies must have no timeline)');
  }
}

function assertNoCompanyActivityServer() {
  const serverPath = path.resolve(process.cwd(), 'src/server.js');
  const text = readText(serverPath);

  const forbidden = [
    /company_created/,
    /company_archived/,
    /\/companies\/[^\n]*\/activities/,
    /companies\/\:companyId\/activities/
  ].filter((re) => re.test(text));

  if (forbidden.length) {
    fail('Phase 16 guard failed: server contains company-activity or company-timeline patterns');
  }
}

function assertNoPlaceholderDemoStringsOutsideReports() {
  const roots = [
    path.resolve(process.cwd(), 'web/src/pages/companies'),
    path.resolve(process.cwd(), 'web/src/pages/contacts'),
    path.resolve(process.cwd(), 'web/src/components/modals')
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const entries = fs.readdirSync(root);
    const files = entries.filter((f) => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'));

    for (const f of files) {
      const content = readText(path.join(root, f)).toLowerCase();
      if (content.includes('placeholder')) {
        fail(`Phase 16 guard failed: placeholder string found (${path.relative(process.cwd(), path.join(root, f))})`);
      }
      if (content.includes('demo')) {
        fail(`Phase 16 guard failed: demo string found (${path.relative(process.cwd(), path.join(root, f))})`);
      }
    }
  }
}

assertNoReportWrites();
assertSchemaDiffLimitedToCompanies();
assertMigrationsLimitedToPhase16Folder();
assertNoCompanyTimelineUI();
assertNoCompanyActivityServer();
assertNoPlaceholderDemoStringsOutsideReports();

// eslint-disable-next-line no-console
console.log('Phase 16 guards: OK');
