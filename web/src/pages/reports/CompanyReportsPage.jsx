import React from 'react';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../state/session.jsx';
import {
  reportCompanyActivityMix,
  reportCompanyActivityVolume,
  reportCompanyContactCoverage,
  reportCompanyGrowth,
  reportCompanyLastActivity
} from '../../api/crm.js';

function Table({ rows, columns, rowKey }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompanyReportsPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();

  const state = useAsync(async () => {
    if (!workspaceId) return { forbidden: false, rows: null };
    if (!actorUserId.trim()) return { forbidden: false, rows: null };

    try {
      const [volume, last, mix, coverage, growth] = await Promise.all([
        reportCompanyActivityVolume(workspaceId, { actorUserId: actorUserId.trim() }),
        reportCompanyLastActivity(workspaceId, { actorUserId: actorUserId.trim() }),
        reportCompanyActivityMix(workspaceId, { actorUserId: actorUserId.trim() }),
        reportCompanyContactCoverage(workspaceId, { actorUserId: actorUserId.trim() }),
        reportCompanyGrowth(workspaceId, { actorUserId: actorUserId.trim() })
      ]);

      return { forbidden: false, volume, last, mix, coverage, growth };
    } catch (err) {
      if (err?.status === 403) return { forbidden: true };
      throw err;
    }
  }, [workspaceId, actorUserId]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <ObjectIndexLayout title="Company reports" subNav={subNav}>
        <div>Loading…</div>
      </ObjectIndexLayout>
    );
  }

  if (state.status === 'error') {
    return (
      <ObjectIndexLayout title="Company reports" subNav={subNav}>
        <EmptyState title="Failed to load" description={state.error.message} />
      </ObjectIndexLayout>
    );
  }

  if (state.data?.forbidden) {
    return null;
  }

  if (!state.data?.volume && !state.data?.last && !state.data?.mix && !state.data?.coverage && !state.data?.growth) {
    return (
      <ObjectIndexLayout title="Company reports" subNav={subNav}>
        <EmptyState title="No data" description="Select a workspace and actor." />
      </ObjectIndexLayout>
    );
  }

  const volumeRows = Array.isArray(state.data?.volume?.rows) ? state.data.volume.rows : [];
  const lastRows = Array.isArray(state.data?.last?.rows) ? state.data.last.rows : [];
  const mixRows = Array.isArray(state.data?.mix?.rows) ? state.data.mix.rows : [];
  const coverageRows = Array.isArray(state.data?.coverage?.rows) ? state.data.coverage.rows : [];
  const growthRows = Array.isArray(state.data?.growth?.rows) ? state.data.growth.rows : [];

  return (
    <ObjectIndexLayout title="Company reports" subNav={subNav}>
      <div className="ui-stack-lg ui-max-900">
        <section>
          <h2 className="ui-h2">Activity volume (7/30/90)</h2>
          {volumeRows.length ? (
            <Table
              rows={volumeRows}
              rowKey={(r) => r.companyId}
              columns={[
                { key: 'company', label: 'company', render: (r) => r.companyName ?? r.companyId },
                { key: 'count7d', label: '7d', render: (r) => r.count7d },
                { key: 'count30d', label: '30d', render: (r) => r.count30d },
                { key: 'count90d', label: '90d', render: (r) => r.count90d }
              ]}
            />
          ) : (
            <EmptyState title="No data" description="No companies or no activity." />
          )}
        </section>

        <section>
          <h2 className="ui-h2">Last activity</h2>
          {lastRows.length ? (
            <Table
              rows={lastRows}
              rowKey={(r) => r.companyId}
              columns={[
                { key: 'company', label: 'company', render: (r) => r.companyName ?? r.companyId },
                {
                  key: 'lastOccurredAt',
                  label: 'lastOccurredAt',
                  render: (r) => (r.lastOccurredAt ? new Date(r.lastOccurredAt).toLocaleString() : '')
                },
                { key: 'lastType', label: 'type', render: (r) => r.lastType ?? '' },
                { key: 'lastSubtype', label: 'subtype', render: (r) => r.lastSubtype ?? '' }
              ]}
            />
          ) : (
            <EmptyState title="No activity" description="No activity found." />
          )}
        </section>

        <section>
          <h2 className="ui-h2">Activity mix (30d)</h2>
          {mixRows.length ? (
            <Table
              rows={mixRows}
              rowKey={(r) => `${r.companyId}:${r.subtype}`}
              columns={[
                { key: 'company', label: 'company', render: (r) => r.companyName ?? r.companyId },
                { key: 'subtype', label: 'subtype', render: (r) => r.subtype },
                { key: 'count', label: 'count', render: (r) => r.count }
              ]}
            />
          ) : (
            <EmptyState title="No activity" description="No activity in the last 30 days." />
          )}
        </section>

        <section>
          <h2 className="ui-h2">Contact coverage (30d)</h2>
          {coverageRows.length ? (
            <Table
              rows={coverageRows}
              rowKey={(r) => r.companyId}
              columns={[
                { key: 'company', label: 'company', render: (r) => r.companyName ?? r.companyId },
                { key: 'activeContacts', label: 'activeContacts', render: (r) => r.activeContacts },
                { key: 'primaryContacts', label: 'primaryContacts', render: (r) => r.primaryContacts },
                { key: 'activeContactsWithActivity30d', label: 'contactsActive30d', render: (r) => r.activeContactsWithActivity30d },
                {
                  key: 'avgActivitiesPerActiveContact30d',
                  label: 'avgActsPerContact30d',
                  render: (r) => (typeof r.avgActivitiesPerActiveContact30d === 'number' ? r.avgActivitiesPerActiveContact30d.toFixed(2) : '')
                }
              ]}
            />
          ) : (
            <EmptyState title="No data" description="No companies." />
          )}
        </section>

        <section>
          <h2 className="ui-h2">Growth (7/30/90)</h2>
          {growthRows.length ? (
            <Table
              rows={growthRows}
              rowKey={(r) => r.companyId}
              columns={[
                { key: 'company', label: 'company', render: (r) => r.companyName ?? r.companyId },
                { key: 'net7d', label: 'net7d', render: (r) => r.net7d },
                { key: 'net30d', label: 'net30d', render: (r) => r.net30d },
                { key: 'net90d', label: 'net90d', render: (r) => r.net90d },
                { key: 'added30d', label: 'added30d', render: (r) => r.added30d },
                { key: 'removed30d', label: 'removed30d', render: (r) => r.removed30d }
              ]}
            />
          ) : (
            <EmptyState title="No data" description="No association events found." />
          )}
        </section>
      </div>
    </ObjectIndexLayout>
  );
}
