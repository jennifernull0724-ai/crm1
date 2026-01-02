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

function assertNoNonGetCompanyReportRoutes() {
  const serverPath = path.resolve(process.cwd(), 'src/server.js');
  const text = readText(serverPath);

  const bad = text.match(/app\.(post|put|patch|delete)\(\s*['"`][^'"`]*\/reports\/companies\b/gi);
  if (bad && bad.length) {
    fail(`Phase 17 guard failed: non-GET route(s) found under /reports/companies: ${bad.join(', ')}`);
  }
}

function assertCompanyReportSectionIsReadOnly() {
  const serverPath = path.resolve(process.cwd(), 'src/server.js');
  const text = readText(serverPath);

  const marker = '// Phase 17';
  const start = text.indexOf(marker);
  if (start < 0) {
    fail('Phase 17 guard failed: missing Phase 17 marker in src/server.js');
  }

  const nextSection = text.indexOf('// GET /workspaces/:workspaceId/contacts/:contactId', start);
  const slice = nextSection > start ? text.slice(start, nextSection) : text.slice(start);

  const forbiddenCalls = slice.match(/\bprisma\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\b/g);
  if (forbiddenCalls && forbiddenCalls.length) {
    fail(`Phase 17 guard failed: write ORM call(s) found in company reports section: ${forbiddenCalls.join(', ')}`);
  }

  if (/\b\$executeRaw\b/i.test(slice)) {
    fail('Phase 17 guard failed: $executeRaw is forbidden in company reports section');
  }

  if (/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(slice)) {
    fail('Phase 17 guard failed: mutation keyword found in company reports SQL (must be SELECT-only)');
  }
}

function assertNoCompanyTimelineUI() {
  const companyPage = path.resolve(process.cwd(), 'web/src/pages/companies/CompanyRecordPage.jsx');
  if (!fs.existsSync(companyPage)) return;

  const text = readText(companyPage);
  if (/ActivityTimeline\b/.test(text)) {
    fail('Phase 17 guard failed: CompanyRecordPage references ActivityTimeline (companies must have no timeline)');
  }
}

function assertNoPlaceholderDemoStrings() {
  const roots = [
    path.resolve(process.cwd(), 'web/src/pages/reports'),
    path.resolve(process.cwd(), 'web/src/pages/companies'),
    path.resolve(process.cwd(), 'web/src/pages/contacts'),
    path.resolve(process.cwd(), 'web/src/components')
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;

    const entries = fs.readdirSync(root);
    const files = entries
      .filter((f) => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => path.join(root, f));

    for (const filePath of files) {
      const content = readText(filePath).toLowerCase();
      if (content.includes('placeholder')) {
        fail(`Phase 17 guard failed: placeholder string found (${path.relative(process.cwd(), filePath)})`);
      }
      if (content.includes('demo')) {
        fail(`Phase 17 guard failed: demo string found (${path.relative(process.cwd(), filePath)})`);
      }
    }
  }
}

assertNoNonGetCompanyReportRoutes();
assertCompanyReportSectionIsReadOnly();
assertNoCompanyTimelineUI();
assertNoPlaceholderDemoStrings();

// eslint-disable-next-line no-console
console.log('Phase 17 guards: OK');
