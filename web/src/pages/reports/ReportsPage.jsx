import React from 'react';
import { Link } from 'react-router-dom';

import ObjectIndexLayout from '../../layouts/ObjectIndexLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useSession } from '../../state/session.jsx';
import {
  reportAssociationCoverage,
  reportContactActivity,
  reportDealVelocity,
  reportTicketSla
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

export default function ReportsPage({ subNav }) {
  const { workspaceId, actorUserId } = useSession();

  // Phase 19: route-level gating prevents rendering when denied.
  // If invoked without a configured actor, render nothing.
  if (!actorUserId.trim()) return null;

  const contactActivityState = useAsync(
    () => reportContactActivity(workspaceId, { actorUserId: actorUserId.trim() }),
    [workspaceId, actorUserId]
  );
  const dealVelocityState = useAsync(
    () => reportDealVelocity(workspaceId, { actorUserId: actorUserId.trim() }),
    [workspaceId, actorUserId]
  );
  const ticketSlaState = useAsync(
    () => reportTicketSla(workspaceId, { actorUserId: actorUserId.trim() }),
    [workspaceId, actorUserId]
  );
  const assocCoverageState = useAsync(
    () => reportAssociationCoverage(workspaceId, { actorUserId: actorUserId.trim() }),
    [workspaceId, actorUserId]
  );

  return (
    <ObjectIndexLayout title="Reports" subNav={subNav}>
      <div className="ui-stack-lg ui-max-900">
        <section>
          <h2 className="ui-h2">Company analytics</h2>
          <div className="ui-text-xs ui-mt-2">
            <Link to="/reports/companies">Open company reports</Link>
          </div>
        </section>

        <section>
          <h2 className="ui-h2">Contact Activity (30d)</h2>
          {contactActivityState.status === 'loading' || contactActivityState.status === 'idle' ? <div>Loading…</div> : null}
          {contactActivityState.status === 'error' ? (
            <EmptyState title="Failed to load" description={contactActivityState.error.message} />
          ) : null}
          {contactActivityState.status === 'success' ? (
            <>
              {Array.isArray(contactActivityState.data?.volume) && contactActivityState.data.volume.length ? (
                <>
                  <div className="ui-text-xs ui-mt-2 ui-mb-2">Volume (last 7/30/90 days)</div>
                  <Table
                    rows={contactActivityState.data.volume}
                    rowKey={(r) => String(r.windowDays)}
                    columns={[
                      { key: 'windowDays', label: 'windowDays', render: (r) => r.windowDays },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(contactActivityState.data?.mixByType) && contactActivityState.data.mixByType.length ? (
                <>
                  <div className="ui-text-xs ui-mt-2 ui-mb-2">Count by activity.type</div>
                  <Table
                    rows={contactActivityState.data.mixByType}
                    rowKey={(r) => r.type}
                    columns={[
                      { key: 'type', label: 'type', render: (r) => r.type },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : (
                <div className="empty">No activity in the last 30 days.</div>
              )}

              {Array.isArray(contactActivityState.data?.mixBySubtype) && contactActivityState.data.mixBySubtype.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Mix (email/call/meeting/task/note)</div>
                  <Table
                    rows={contactActivityState.data.mixBySubtype}
                    rowKey={(r) => r.subtype}
                    columns={[
                      { key: 'subtype', label: 'subtype', render: (r) => r.subtype },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(contactActivityState.data?.lastActivityByContact30d) && contactActivityState.data.lastActivityByContact30d.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Last activity per contact (30d window)</div>
                  <Table
                    rows={contactActivityState.data.lastActivityByContact30d}
                    rowKey={(r) => r.contactId}
                    columns={[
                      { key: 'contactId', label: 'contactId', render: (r) => r.contactId },
                      {
                        key: 'lastOccurredAt',
                        label: 'lastOccurredAt',
                        render: (r) => (r.lastOccurredAt ? new Date(r.lastOccurredAt).toLocaleString() : '')
                      }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(contactActivityState.data?.lastActivityByContactAllTime) &&
              contactActivityState.data.lastActivityByContactAllTime.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Last activity per contact (all time)</div>
                  <Table
                    rows={contactActivityState.data.lastActivityByContactAllTime}
                    rowKey={(r) => r.contactId}
                    columns={[
                      { key: 'contactId', label: 'contactId', render: (r) => r.contactId },
                      {
                        key: 'lastOccurredAt',
                        label: 'lastOccurredAt',
                        render: (r) => (r.lastOccurredAt ? new Date(r.lastOccurredAt).toLocaleString() : '')
                      }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(contactActivityState.data?.contactGrowth) && contactActivityState.data.contactGrowth.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Contact growth (created)</div>
                  <Table
                    rows={contactActivityState.data.contactGrowth}
                    rowKey={(r) => String(r.windowDays)}
                    columns={[
                      { key: 'windowDays', label: 'windowDays', render: (r) => r.windowDays },
                      { key: 'createdCount', label: 'createdCount', render: (r) => r.createdCount }
                    ]}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </section>

        <section>
          <h2 className="ui-h2">Deal Velocity</h2>
          {dealVelocityState.status === 'loading' || dealVelocityState.status === 'idle' ? <div>Loading…</div> : null}
          {dealVelocityState.status === 'error' ? <EmptyState title="Failed to load" description={dealVelocityState.error.message} /> : null}
          {dealVelocityState.status === 'success' ? (
            <>
              {Array.isArray(dealVelocityState.data?.transitions) && dealVelocityState.data.transitions.length ? (
                <Table
                  rows={dealVelocityState.data.transitions}
                  rowKey={(r) => `${r.pipelineId}:${r.fromStageId}:${r.toStageId}`}
                  columns={[
                    { key: 'pipelineId', label: 'pipelineId', render: (r) => r.pipelineId },
                    { key: 'fromStageId', label: 'fromStageId', render: (r) => r.fromStageId },
                    { key: 'toStageId', label: 'toStageId', render: (r) => r.toStageId },
                    {
                      key: 'avgDurationSeconds',
                      label: 'avgDurationSeconds',
                      render: (r) => (typeof r.avgDurationSeconds === 'number' ? Math.round(r.avgDurationSeconds) : '')
                    },
                    { key: 'transitionCount', label: 'transitionCount', render: (r) => r.transitionCount }
                  ]}
                />
              ) : (
                <div className="empty">No deal stage transitions found.</div>
              )}

              {Array.isArray(dealVelocityState.data?.winRateByStage) && dealVelocityState.data.winRateByStage.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Win rate inputs (counts by pipeline/stage/status)</div>
                  <Table
                    rows={dealVelocityState.data.winRateByStage}
                    rowKey={(r) => `${r.pipelineId}:${r.stageId}:${r.status}`}
                    columns={[
                      { key: 'pipelineId', label: 'pipelineId', render: (r) => r.pipelineId },
                      { key: 'stageId', label: 'stageId', render: (r) => r.stageId },
                      { key: 'status', label: 'status', render: (r) => r.status },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(dealVelocityState.data?.avgDealAge) && dealVelocityState.data.avgDealAge.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Average deal age (seconds)</div>
                  <Table
                    rows={dealVelocityState.data.avgDealAge}
                    rowKey={(r) => r.status}
                    columns={[
                      { key: 'status', label: 'status', render: (r) => r.status },
                      {
                        key: 'avgAgeSeconds',
                        label: 'avgAgeSeconds',
                        render: (r) => (typeof r.avgAgeSeconds === 'number' ? Math.round(r.avgAgeSeconds) : '')
                      },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(dealVelocityState.data?.dealValueOverTime) && dealVelocityState.data.dealValueOverTime.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Deal value over time (last 90d)</div>
                  <Table
                    rows={dealVelocityState.data.dealValueOverTime}
                    rowKey={(r) => r.day}
                    columns={[
                      { key: 'day', label: 'day', render: (r) => r.day },
                      {
                        key: 'totalAmount',
                        label: 'totalAmount',
                        render: (r) => (typeof r.totalAmount === 'number' ? r.totalAmount.toFixed(2) : '')
                      },
                      { key: 'dealCount', label: 'dealCount', render: (r) => r.dealCount }
                    ]}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </section>

        <section>
          <h2 className="ui-h2">Ticket SLA</h2>
          {ticketSlaState.status === 'loading' || ticketSlaState.status === 'idle' ? <div>Loading…</div> : null}
          {ticketSlaState.status === 'error' ? <EmptyState title="Failed to load" description={ticketSlaState.error.message} /> : null}
          {ticketSlaState.status === 'success' ? (
            <>
              {Array.isArray(ticketSlaState.data?.slaSummary) && ticketSlaState.data.slaSummary[0] ? (
                <>
                  <div className="ui-text-xs ui-mt-2 ui-mb-2">Summary</div>
                  <Table
                    rows={ticketSlaState.data.slaSummary}
                    rowKey={() => 'summary'}
                    columns={[
                      { key: 'ticketCount', label: 'ticketCount', render: (r) => r.ticketCount },
                      { key: 'ticketsWithFirstResponse', label: 'ticketsWithFirstResponse', render: (r) => r.ticketsWithFirstResponse },
                      {
                        key: 'avgTimeToFirstResponseSeconds',
                        label: 'avgTTFRSeconds',
                        render: (r) =>
                          typeof r.avgTimeToFirstResponseSeconds === 'number' ? Math.round(r.avgTimeToFirstResponseSeconds) : ''
                      },
                      { key: 'ticketsResolved', label: 'ticketsResolved', render: (r) => r.ticketsResolved },
                      {
                        key: 'avgTimeToResolutionSeconds',
                        label: 'avgTTRSeconds',
                        render: (r) =>
                          typeof r.avgTimeToResolutionSeconds === 'number' ? Math.round(r.avgTimeToResolutionSeconds) : ''
                      }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(ticketSlaState.data?.openClosed) && ticketSlaState.data.openClosed.length ? (
                <>
                  <div className="ui-text-xs ui-mt-2 ui-mb-2">Open vs closed (current state)</div>
                  <Table
                    rows={ticketSlaState.data.openClosed}
                    rowKey={(r) => r.status}
                    columns={[
                      { key: 'status', label: 'status', render: (r) => r.status },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(ticketSlaState.data?.agingBuckets) && ticketSlaState.data.agingBuckets.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Aging buckets (open/waiting)</div>
                  <Table
                    rows={ticketSlaState.data.agingBuckets}
                    rowKey={(r) => r.bucket}
                    columns={[
                      { key: 'bucket', label: 'bucket', render: (r) => r.bucket },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(ticketSlaState.data?.sla) && ticketSlaState.data.sla.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Per-ticket metrics (derived from Activities)</div>
                  <Table
                    rows={ticketSlaState.data.sla.slice(0, 50)}
                    rowKey={(r) => r.ticketId}
                    columns={[
                      { key: 'ticketId', label: 'ticketId', render: (r) => r.ticketId },
                      {
                        key: 'ticketCreatedAt',
                        label: 'ticketCreatedAt',
                        render: (r) => (r.ticketCreatedAt ? new Date(r.ticketCreatedAt).toLocaleString() : '')
                      },
                      {
                        key: 'firstResponseAt',
                        label: 'firstResponseAt',
                        render: (r) => (r.firstResponseAt ? new Date(r.firstResponseAt).toLocaleString() : '')
                      },
                      {
                        key: 'resolvedAt',
                        label: 'resolvedAt',
                        render: (r) => (r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : '')
                      },
                      {
                        key: 'timeToFirstResponseSeconds',
                        label: 'ttfrSeconds',
                        render: (r) => (typeof r.timeToFirstResponseSeconds === 'number' ? Math.round(r.timeToFirstResponseSeconds) : '')
                      },
                      {
                        key: 'timeToResolutionSeconds',
                        label: 'ttrSeconds',
                        render: (r) => (typeof r.timeToResolutionSeconds === 'number' ? Math.round(r.timeToResolutionSeconds) : '')
                      }
                    ]}
                  />
                  <div className="ui-text-xs ui-mt-2">
                    Showing latest 50 tickets.
                  </div>
                </>
              ) : (
                <div className="empty">No ticket Activity data found.</div>
              )}
            </>
          ) : null}
        </section>

        <section>
          <h2 className="ui-h2">Association Coverage</h2>
          {assocCoverageState.status === 'loading' || assocCoverageState.status === 'idle' ? <div>Loading…</div> : null}
          {assocCoverageState.status === 'error' ? <EmptyState title="Failed to load" description={assocCoverageState.error.message} /> : null}
          {assocCoverageState.status === 'success' ? (
            <>
              {Array.isArray(assocCoverageState.data?.dealCoverage) && assocCoverageState.data.dealCoverage[0] ? (
                <>
                  <div className="ui-text-xs ui-mt-2 ui-mb-2">Deals</div>
                  <Table
                    rows={assocCoverageState.data.dealCoverage}
                    rowKey={() => 'deals'}
                    columns={[
                      { key: 'dealCount', label: 'dealCount', render: (r) => r.dealCount },
                      { key: 'dealsWithPrimary', label: 'dealsWithPrimary', render: (r) => r.dealsWithPrimary },
                      {
                        key: 'primaryCoverage',
                        label: 'primaryCoverage',
                        render: (r) =>
                          r.dealCount ? `${Math.round((r.dealsWithPrimary / r.dealCount) * 100)}%` : '0%'
                      },
                      {
                        key: 'avgContactsPerDeal',
                        label: 'avgContactsPerDeal',
                        render: (r) => (typeof r.avgContactsPerDeal === 'number' ? r.avgContactsPerDeal.toFixed(2) : '')
                      }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(assocCoverageState.data?.ticketCoverage) && assocCoverageState.data.ticketCoverage[0] ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Tickets</div>
                  <Table
                    rows={assocCoverageState.data.ticketCoverage}
                    rowKey={() => 'tickets'}
                    columns={[
                      { key: 'ticketCount', label: 'ticketCount', render: (r) => r.ticketCount },
                      { key: 'ticketsWithPrimary', label: 'ticketsWithPrimary', render: (r) => r.ticketsWithPrimary },
                      {
                        key: 'primaryCoverage',
                        label: 'primaryCoverage',
                        render: (r) =>
                          r.ticketCount ? `${Math.round((r.ticketsWithPrimary / r.ticketCount) * 100)}%` : '0%'
                      },
                      {
                        key: 'avgContactsPerTicket',
                        label: 'avgContactsPerTicket',
                        render: (r) => (typeof r.avgContactsPerTicket === 'number' ? r.avgContactsPerTicket.toFixed(2) : '')
                      }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(assocCoverageState.data?.dealContactsDistribution) && assocCoverageState.data.dealContactsDistribution.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Contacts per deal (distribution)</div>
                  <Table
                    rows={assocCoverageState.data.dealContactsDistribution}
                    rowKey={(r) => r.bucket}
                    columns={[
                      { key: 'bucket', label: 'bucket', render: (r) => r.bucket },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(assocCoverageState.data?.ticketContactsDistribution) && assocCoverageState.data.ticketContactsDistribution.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Contacts per ticket (distribution)</div>
                  <Table
                    rows={assocCoverageState.data.ticketContactsDistribution}
                    rowKey={(r) => r.bucket}
                    columns={[
                      { key: 'bucket', label: 'bucket', render: (r) => r.bucket },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : null}

              {Array.isArray(assocCoverageState.data?.churn) && assocCoverageState.data.churn.length ? (
                <>
                  <div className="ui-text-xs ui-mt-3 ui-mb-2">Association churn (30d)</div>
                  <Table
                    rows={assocCoverageState.data.churn}
                    rowKey={(r) => `${r.day}:${r.type}:${r.kind ?? ''}`}
                    columns={[
                      { key: 'day', label: 'day', render: (r) => r.day },
                      { key: 'type', label: 'type', render: (r) => r.type },
                      { key: 'kind', label: 'kind', render: (r) => r.kind ?? '' },
                      { key: 'count', label: 'count', render: (r) => r.count }
                    ]}
                  />
                </>
              ) : (
                <div className="empty">No association churn in the last 30 days.</div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </ObjectIndexLayout>
  );
}
