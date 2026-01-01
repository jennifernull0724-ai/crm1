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

function assertNoReportWrites() {
  const serverPath = path.resolve(process.cwd(), 'src/server.js');
  const text = readText(serverPath);

  const bad = text.match(/app\.(post|put|patch|delete)\(\s*['"`][^'"`]*\/reports\b/gi);
  if (bad && bad.length) {
    fail(`Phase 14 guard failed: write route(s) found under /reports: ${bad.join(', ')}`);
  }
}

function assertNoSchemaDiffs() {
  try {
    execSync('git diff --exit-code -- prisma/schema.prisma prisma/migrations db/enforcement.sql', {
      stdio: 'ignore'
    });
  } catch {
    fail('Phase 14 guard failed: schema/migrations/enforcement diff detected');
  }
}

function assertNoPlaceholderDemoStringsInReportsUI() {
  const reportsDir = path.resolve(process.cwd(), 'web/src/pages/reports');
  if (!fs.existsSync(reportsDir)) return;

  const entries = fs.readdirSync(reportsDir);
  const files = entries.filter((f) => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'));

  for (const f of files) {
    const content = readText(path.join(reportsDir, f)).toLowerCase();
    if (content.includes('placeholder')) {
      fail(`Phase 14 guard failed: placeholder string found in reports UI (${f})`);
    }
    if (content.includes('demo')) {
      fail(`Phase 14 guard failed: demo string found in reports UI (${f})`);
    }
  }
}

assertNoReportWrites();
assertNoSchemaDiffs();
assertNoPlaceholderDemoStringsInReportsUI();

// eslint-disable-next-line no-console
console.log('Phase 14 guards: OK');
