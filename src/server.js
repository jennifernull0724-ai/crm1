import express from 'express';
import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
import { startAutomationEngine } from './automation.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

function rejectDemoMockSample(req, res) {
  const haystack = JSON.stringify({ params: req.params, query: req.query, body: req.body }).toLowerCase();
  if (haystack.includes('demo') || haystack.includes('mock') || haystack.includes('sample')) {
    res.status(400).json({ error: 'Forbidden payload content' });
    return true;
  }
  return false;
}

function nowIso() {
  return new Date();
}

function requireActorUserId(req, res) {
  const actorUserId = req.header('x-actor-user-id') ?? req.body?.actorUserId;
  if (typeof actorUserId !== 'string' || !actorUserId.trim()) {
    res.status(400).json({ error: 'actorUserId is required (use x-actor-user-id header)' });
    return null;
  }
  return actorUserId.trim();
}

function getReadActorUserId(req) {
  const actorUserId = req.header('x-actor-user-id');
  if (typeof actorUserId !== 'string' || !actorUserId.trim()) return null;
  return actorUserId.trim();
}

function parseOccurredAt(input) {
  if (input === undefined || input === null) return nowIso();
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function pickContactFields(input) {
  const out = {};
  if (input && typeof input === 'object') {
    if (typeof input.email === 'string' || input.email === null) out.email = input.email;
    if (typeof input.firstName === 'string' || input.firstName === null) out.firstName = input.firstName;
    if (typeof input.lastName === 'string' || input.lastName === null) out.lastName = input.lastName;
  }
  return out;
}

function isSnakeCaseKey(key) {
  return typeof key === 'string' && /^[a-z][a-z0-9_]*$/.test(key);
}

function parsePropertyType(input) {
  if (typeof input !== 'string') return null;
  const t = input.trim();
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'date' || t === 'enum') return t;
  return null;
}

function validatePropertyValue(definition, incomingValue) {
  const type = definition.type;

  if (type === 'string') {
    if (typeof incomingValue !== 'string') return { ok: false, error: 'Invalid value type (expected string)' };
    return { ok: true, normalized: incomingValue };
  }

  if (type === 'number') {
    if (typeof incomingValue !== 'number' || Number.isNaN(incomingValue)) return { ok: false, error: 'Invalid value type (expected number)' };
    return { ok: true, normalized: incomingValue };
  }

  if (type === 'boolean') {
    if (typeof incomingValue !== 'boolean') return { ok: false, error: 'Invalid value type (expected boolean)' };
    return { ok: true, normalized: incomingValue };
  }

  if (type === 'date') {
    if (typeof incomingValue !== 'string') return { ok: false, error: 'Invalid value type (expected ISO date string)' };
    const d = new Date(incomingValue);
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'Invalid date value' };
    return { ok: true, normalized: d.toISOString() };
  }

  if (type === 'enum') {
    if (typeof incomingValue !== 'string') return { ok: false, error: 'Invalid value type (expected string enum)' };
    const options = definition.options;
    const values = Array.isArray(options) ? options : (options && Array.isArray(options.values) ? options.values : null);
    if (!values) return { ok: false, error: 'Enum options are not configured' };
    if (!values.includes(incomingValue)) return { ok: false, error: 'Value not in enum options' };
    return { ok: true, normalized: incomingValue };
  }

  return { ok: false, error: 'Unsupported property type' };
}

function parseCompanyRole(input) {
  if (typeof input !== 'string') return null;
  const r = input.trim();
  if (r === 'primary' || r === 'employee' || r === 'contractor' || r === 'other') return r;
  return null;
}

function pickCompanyFields(input) {
  const out = {};
  if (input && typeof input === 'object') {
    if (typeof input.name === 'string') out.name = input.name;
    if (typeof input.legalName === 'string' || input.legalName === null) out.legalName = input.legalName;
    if (typeof input.domain === 'string' || input.domain === null) out.domain = input.domain;
    if (typeof input.industry === 'string' || input.industry === null) out.industry = input.industry;
    if (typeof input.sizeRange === 'string' || input.sizeRange === null) out.sizeRange = input.sizeRange;
    if (typeof input.website === 'string' || input.website === null) out.website = input.website;
    if (typeof input.country === 'string' || input.country === null) out.country = input.country;
    if (typeof input.region === 'string' || input.region === null) out.region = input.region;
  }
  return out;
}

function pickDealFields(input) {
  const out = {};
  if (input && typeof input === 'object') {
    if (typeof input.name === 'string') out.name = input.name;
    if (typeof input.amount === 'number' || input.amount === null) out.amount = input.amount;
    if (typeof input.currency === 'string' || input.currency === null) out.currency = input.currency;
    if (typeof input.pipelineId === 'string') out.pipelineId = input.pipelineId;
    if (typeof input.stageId === 'string') out.stageId = input.stageId;
    if (typeof input.primaryContactId === 'string') out.primaryContactId = input.primaryContactId;
  }
  return out;
}

function pickTicketFields(input) {
  const out = {};
  if (input && typeof input === 'object') {
    if (typeof input.subject === 'string') out.subject = input.subject;
    if (typeof input.description === 'string' || input.description === null) out.description = input.description;
    if (typeof input.priority === 'string') out.priority = input.priority;
    if (typeof input.status === 'string') out.status = input.status;
    if (typeof input.primaryContactId === 'string') out.primaryContactId = input.primaryContactId;
    if (Array.isArray(input.additionalContactIds)) out.additionalContactIds = input.additionalContactIds;
    if (typeof input.dealId === 'string' || input.dealId === null) out.dealId = input.dealId;
  }
  return out;
}

function parseTicketPriority(input) {
  if (typeof input !== 'string') return null;
  const p = input.trim().toLowerCase();
  if (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent') return p;
  return null;
}

function parseCreateTicketStatus(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().toUpperCase();
  if (s === 'OPEN') return { api: 'OPEN', db: 'open' };
  if (s === 'PENDING') return { api: 'PENDING', db: 'waiting' };
  if (s === 'CLOSED') return { api: 'CLOSED', db: 'closed' };
  return null;
}

const TICKET_SUBJECT_MAX_LEN = 200;

function getActorPermissions(actorUserId) {
  const raw = process.env.ACTOR_PERMISSIONS_JSON;
  if (!raw) return null;
  try {
    const map = JSON.parse(raw);
    const perms = map?.[actorUserId];
    return Array.isArray(perms) ? perms.filter((p) => typeof p === 'string') : null;
  } catch {
    return null;
  }
}

function requireReadScope(req, res, { workspaceId, resource }) {
  const actorUserId = getReadActorUserId(req);
  if (!actorUserId) {
    res.status(403).end();
    return null;
  }

  const configuredPerms = getActorPermissions(actorUserId);
  if (!configuredPerms) {
    res.status(403).end();
    return null;
  }

  const resourceKey = typeof resource === 'string' ? resource.trim() : '';
  const required =
    resourceKey === 'reports'
      ? ['reports:read']
      : resourceKey === 'automation'
        ? ['automation:read']
        : [`${resourceKey}:read`];

  if (required.some((p) => !configuredPerms.includes(p))) {
    res.status(403).end();
    return null;
  }

  return { actorUserId, workspaceId, permissions: configuredPerms };
}

function requireReportReadAccess(req, res, { workspaceId, permissions = [] }) {
  // Phase 19: reports are guarded via centralized read scope.
  // On denial: 403 with no response body.
  // Keep signature for existing call sites; ignore custom permissions.
  void permissions;
  return requireReadScope(req, res, { workspaceId, resource: 'reports' });
}

// Phase 0: Workspace reads (needed for UI shell gating and switcher) ----------

// GET /workspaces
app.get('/workspaces', async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json(workspaces);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId
app.get('/workspaces/:workspaceId', async (req, res) => {
  const { workspaceId } = req.params;
  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    res.status(200).json(workspace);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/permissions
// Minimal permission surface for UI gating. Configure via ACTOR_PERMISSIONS_JSON.
app.get('/workspaces/:workspaceId/permissions', async (req, res) => {
  const actorUserId = req.header('x-actor-user-id') ?? req.query?.actorUserId;
  if (typeof actorUserId !== 'string' || !actorUserId.trim()) {
    res.status(400).json({ error: 'actorUserId is required (use x-actor-user-id header)' });
    return;
  }

  const perms = getActorPermissions(actorUserId.trim());
  if (!perms) {
    // Default: deny everything unless configured.
    res.status(200).json({ permissions: [] });
    return;
  }

  res.status(200).json({ permissions: perms });
});

// Phase 1 reads --------------------------------------------------------------

// GET /workspaces/:workspaceId/contacts
app.get('/workspaces/:workspaceId/contacts', async (req, res) => {
  const { workspaceId } = req.params;
  const includeArchived = req.query?.includeArchived === 'true';

  const auth = requireReadScope(req, res, { workspaceId, resource: 'contacts' });
  if (!auth) return;

  try {
    const contacts = await prisma.contact.findMany({
      where: { workspaceId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: [{ createdAt: 'asc' }]
    });

    res.status(200).json(contacts);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 14 -------------------------------------------------------------------
// Reporting (GET-only). Read-only: SELECTs and projections only.

// GET /workspaces/:workspaceId/reports/contacts/activity
// Locked: Contact Activity (30d)
app.get('/workspaces/:workspaceId/reports/contacts/activity', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const [mixByType, lastActivityByContact30d, lastActivityByContactAllTime, volume, mixBySubtype, contactGrowth] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          a.type AS "type",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
        GROUP BY a.type
        ORDER BY "count" DESC, a.type ASC;
      `,
      prisma.$queryRaw`
        SELECT
          a."contactId" AS "contactId",
          MAX(a."occurredAt") AS "lastOccurredAt"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
        GROUP BY a."contactId"
        ORDER BY "lastOccurredAt" DESC;
      `,
      prisma.$queryRaw`
        SELECT
          a."contactId" AS "contactId",
          MAX(a."occurredAt") AS "lastOccurredAt"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
        GROUP BY a."contactId"
        ORDER BY "lastOccurredAt" DESC;
      `,
      prisma.$queryRaw`
        SELECT
          7 AS "windowDays",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '7 days')
        UNION ALL
        SELECT
          30 AS "windowDays",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
        UNION ALL
        SELECT
          90 AS "windowDays",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '90 days')
        ORDER BY "windowDays" ASC;
      `,
      prisma.$queryRaw`
        SELECT
          a.subtype AS "subtype",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
          AND a.subtype IN ('email', 'call', 'meeting', 'task', 'note')
        GROUP BY a.subtype
        ORDER BY "count" DESC, a.subtype ASC;
      `,
      prisma.$queryRaw`
        SELECT
          7 AS "windowDays",
          COUNT(*)::int AS "createdCount"
        FROM "Contact" c
        WHERE c."workspaceId" = ${workspaceId}
          AND c."createdAt" >= (NOW() - INTERVAL '7 days')
        UNION ALL
        SELECT
          30 AS "windowDays",
          COUNT(*)::int AS "createdCount"
        FROM "Contact" c
        WHERE c."workspaceId" = ${workspaceId}
          AND c."createdAt" >= (NOW() - INTERVAL '30 days')
        UNION ALL
        SELECT
          90 AS "windowDays",
          COUNT(*)::int AS "createdCount"
        FROM "Contact" c
        WHERE c."workspaceId" = ${workspaceId}
          AND c."createdAt" >= (NOW() - INTERVAL '90 days')
        ORDER BY "windowDays" ASC;
      `
    ]);

    res.status(200).json({
      windowDays: 30,
      mixByType,
      lastActivityByContact30d,
      lastActivityByContactAllTime,
      volume,
      mixBySubtype,
      contactGrowth
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/deals/velocity
// Locked: Deal Velocity = avg(occurredAt_stage_n+1 - occurredAt_stage_n)
app.get('/workspaces/:workspaceId/reports/deals/velocity', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const [transitions, winRateByStage, avgDealAge, dealValueOverTime] = await Promise.all([
      prisma.$queryRaw`
        WITH events AS (
          SELECT
            (a.payload->>'dealId') AS deal_id,
            (a.payload->>'pipelineId') AS pipeline_id,
            (a.payload->>'stageId') AS stage_id,
            a."occurredAt" AS occurred_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND a.type IN ('deal_created', 'deal_stage_changed')
            AND (a.payload->>'dealId') IS NOT NULL
            AND (a.payload->>'pipelineId') IS NOT NULL
            AND (a.payload->>'stageId') IS NOT NULL
        ),
        ordered AS (
          SELECT
            deal_id,
            pipeline_id,
            stage_id AS from_stage_id,
            occurred_at AS from_occurred_at,
            LEAD(stage_id) OVER (PARTITION BY deal_id ORDER BY occurred_at) AS to_stage_id,
            LEAD(occurred_at) OVER (PARTITION BY deal_id ORDER BY occurred_at) AS to_occurred_at
          FROM events
        ),
        transitions AS (
          SELECT
            deal_id,
            pipeline_id,
            from_stage_id,
            to_stage_id,
            EXTRACT(EPOCH FROM (to_occurred_at - from_occurred_at))::double precision AS duration_seconds
          FROM ordered
          WHERE to_occurred_at IS NOT NULL
            AND to_stage_id IS NOT NULL
            AND from_stage_id IS NOT NULL
        )
        SELECT
          pipeline_id AS "pipelineId",
          from_stage_id AS "fromStageId",
          to_stage_id AS "toStageId",
          AVG(duration_seconds)::double precision AS "avgDurationSeconds",
          COUNT(*)::int AS "transitionCount"
        FROM transitions
        GROUP BY pipeline_id, from_stage_id, to_stage_id
        ORDER BY "transitionCount" DESC, "avgDurationSeconds" ASC;
      `,
      prisma.$queryRaw`
        SELECT
          d."pipelineId" AS "pipelineId",
          d."stageId" AS "stageId",
          d.status AS "status",
          COUNT(*)::int AS "count"
        FROM "Deal" d
        WHERE d."workspaceId" = ${workspaceId}
          AND d."archivedAt" IS NULL
        GROUP BY d."pipelineId", d."stageId", d.status
        ORDER BY "pipelineId" ASC, "stageId" ASC, "status" ASC;
      `,
      prisma.$queryRaw`
        SELECT
          d.status AS "status",
          AVG(EXTRACT(EPOCH FROM (NOW() - d."createdAt")))::double precision AS "avgAgeSeconds",
          COUNT(*)::int AS "count"
        FROM "Deal" d
        WHERE d."workspaceId" = ${workspaceId}
          AND d."archivedAt" IS NULL
        GROUP BY d.status
        ORDER BY "status" ASC;
      `,
      prisma.$queryRaw`
        SELECT
          date_trunc('day', d."createdAt")::date AS "day",
          SUM(COALESCE(d.amount, 0))::double precision AS "totalAmount",
          COUNT(*)::int AS "dealCount"
        FROM "Deal" d
        WHERE d."workspaceId" = ${workspaceId}
          AND d."archivedAt" IS NULL
          AND d."createdAt" >= (NOW() - INTERVAL '90 days')
        GROUP BY 1
        ORDER BY 1 ASC;
      `
    ]);

    res.status(200).json({ transitions, winRateByStage, avgDealAge, dealValueOverTime, windowDays: 90 });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/tickets/sla
// Locked: Ticket SLA
// - first_response_at - ticket_created_at
// - resolved_at - ticket_created_at
app.get('/workspaces/:workspaceId/reports/tickets/sla', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const [sla, openClosed, agingBuckets, slaSummary] = await Promise.all([
      prisma.$queryRaw`
        WITH created AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS ticket_created_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND a.type = 'ticket_created'
            AND (a.payload->>'ticketId') IS NOT NULL
          GROUP BY (a.payload->>'ticketId')
        ),
        resolved AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS resolved_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND a.type = 'ticket_closed'
            AND (a.payload->>'ticketId') IS NOT NULL
          GROUP BY (a.payload->>'ticketId')
        ),
        first_response AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS first_response_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND (a.payload->>'ticketId') IS NOT NULL
            AND a.subtype IN ('email', 'call', 'meeting', 'note', 'task')
          GROUP BY (a.payload->>'ticketId')
        )
        SELECT
          c.ticket_id AS "ticketId",
          c.ticket_created_at AS "ticketCreatedAt",
          fr.first_response_at AS "firstResponseAt",
          r.resolved_at AS "resolvedAt",
          CASE
            WHEN fr.first_response_at IS NULL THEN NULL
            WHEN fr.first_response_at < c.ticket_created_at THEN NULL
            ELSE EXTRACT(EPOCH FROM (fr.first_response_at - c.ticket_created_at))::double precision
          END AS "timeToFirstResponseSeconds",
          CASE
            WHEN r.resolved_at IS NULL THEN NULL
            WHEN r.resolved_at < c.ticket_created_at THEN NULL
            ELSE EXTRACT(EPOCH FROM (r.resolved_at - c.ticket_created_at))::double precision
          END AS "timeToResolutionSeconds"
        FROM created c
        LEFT JOIN first_response fr ON fr.ticket_id = c.ticket_id
        LEFT JOIN resolved r ON r.ticket_id = c.ticket_id
        ORDER BY c.ticket_created_at DESC;
      `,
      prisma.$queryRaw`
        SELECT
          t.status AS "status",
          COUNT(*)::int AS "count"
        FROM "Ticket" t
        WHERE t."workspaceId" = ${workspaceId}
          AND t."archivedAt" IS NULL
        GROUP BY t.status
        ORDER BY "count" DESC;
      `,
      prisma.$queryRaw`
        WITH open_tickets AS (
          SELECT
            t.id,
            EXTRACT(EPOCH FROM (NOW() - t."createdAt"))::double precision AS age_seconds
          FROM "Ticket" t
          WHERE t."workspaceId" = ${workspaceId}
            AND t."archivedAt" IS NULL
            AND t.status IN ('open', 'waiting')
        )
        SELECT
          bucket AS "bucket",
          COUNT(*)::int AS "count"
        FROM (
          SELECT
            CASE
              WHEN age_seconds < 86400 THEN '0-1d'
              WHEN age_seconds < 86400 * 3 THEN '1-3d'
              WHEN age_seconds < 86400 * 7 THEN '3-7d'
              ELSE '7+d'
            END AS bucket
          FROM open_tickets
        ) b
        GROUP BY bucket
        ORDER BY
          CASE bucket
            WHEN '0-1d' THEN 1
            WHEN '1-3d' THEN 2
            WHEN '3-7d' THEN 3
            ELSE 4
          END;
      `,
      prisma.$queryRaw`
        WITH created AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS ticket_created_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND a.type = 'ticket_created'
            AND (a.payload->>'ticketId') IS NOT NULL
          GROUP BY (a.payload->>'ticketId')
        ),
        resolved AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS resolved_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND a.type = 'ticket_closed'
            AND (a.payload->>'ticketId') IS NOT NULL
          GROUP BY (a.payload->>'ticketId')
        ),
        first_response AS (
          SELECT
            (a.payload->>'ticketId') AS ticket_id,
            MIN(a."occurredAt") AS first_response_at
          FROM "Activity" a
          WHERE a."workspaceId" = ${workspaceId}
            AND (a.payload->>'ticketId') IS NOT NULL
            AND a.subtype IN ('email', 'call', 'meeting', 'note', 'task')
          GROUP BY (a.payload->>'ticketId')
        ),
        metrics AS (
          SELECT
            c.ticket_id,
            CASE
              WHEN fr.first_response_at IS NULL THEN NULL
              WHEN fr.first_response_at < c.ticket_created_at THEN NULL
              ELSE EXTRACT(EPOCH FROM (fr.first_response_at - c.ticket_created_at))::double precision
            END AS ttfr_seconds,
            CASE
              WHEN r.resolved_at IS NULL THEN NULL
              WHEN r.resolved_at < c.ticket_created_at THEN NULL
              ELSE EXTRACT(EPOCH FROM (r.resolved_at - c.ticket_created_at))::double precision
            END AS ttr_seconds
          FROM created c
          LEFT JOIN first_response fr ON fr.ticket_id = c.ticket_id
          LEFT JOIN resolved r ON r.ticket_id = c.ticket_id
        )
        SELECT
          COUNT(*)::int AS "ticketCount",
          COUNT(ttfr_seconds)::int AS "ticketsWithFirstResponse",
          AVG(ttfr_seconds)::double precision AS "avgTimeToFirstResponseSeconds",
          COUNT(ttr_seconds)::int AS "ticketsResolved",
          AVG(ttr_seconds)::double precision AS "avgTimeToResolutionSeconds"
        FROM metrics;
      `
    ]);

    res.status(200).json({ sla, openClosed, agingBuckets, slaSummary });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/associations/coverage
// Locked: Association Coverage
// - % deals with primary contact
// - avg contacts per ticket
app.get('/workspaces/:workspaceId/reports/associations/coverage', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const [dealCoverage, ticketCoverage, churn, dealContactsDistribution, ticketContactsDistribution] = await Promise.all([
      prisma.$queryRaw`
        WITH latest AS (
          SELECT DISTINCT ON (dca."dealId", dca."contactId")
            dca."dealId" AS deal_id,
            dca."contactId" AS contact_id,
            dca."isPrimary" AS is_primary,
            dca."archivedAt" AS archived_at,
            dca."createdAt" AS created_at
          FROM "DealContactAssociation" dca
          WHERE dca."workspaceId" = ${workspaceId}
          ORDER BY dca."dealId", dca."contactId", dca."createdAt" DESC
        ),
        active AS (
          SELECT * FROM latest WHERE archived_at IS NULL
        ),
        deal_rollup AS (
          SELECT
            deal_id,
            MAX(CASE WHEN is_primary THEN 1 ELSE 0 END)::int AS has_primary,
            COUNT(*)::int AS contact_count
          FROM active
          GROUP BY deal_id
        ),
        eligible_deals AS (
          SELECT d.id AS deal_id
          FROM "Deal" d
          WHERE d."workspaceId" = ${workspaceId}
            AND d."archivedAt" IS NULL
        )
        SELECT
          (SELECT COUNT(*)::int FROM eligible_deals) AS "dealCount",
          (SELECT COUNT(*)::int FROM deal_rollup dr JOIN eligible_deals ed ON ed.deal_id = dr.deal_id WHERE dr.has_primary = 1) AS "dealsWithPrimary",
          (SELECT AVG(dr.contact_count)::double precision FROM deal_rollup dr JOIN eligible_deals ed ON ed.deal_id = dr.deal_id) AS "avgContactsPerDeal"
      `,
      prisma.$queryRaw`
        WITH latest AS (
          SELECT DISTINCT ON (tca."ticketId", tca."contactId")
            tca."ticketId" AS ticket_id,
            tca."contactId" AS contact_id,
            tca."isRequester" AS is_requester,
            tca."archivedAt" AS archived_at,
            tca."createdAt" AS created_at
          FROM "TicketContactAssociation" tca
          WHERE tca."workspaceId" = ${workspaceId}
          ORDER BY tca."ticketId", tca."contactId", tca."createdAt" DESC
        ),
        active AS (
          SELECT * FROM latest WHERE archived_at IS NULL
        ),
        ticket_rollup AS (
          SELECT
            ticket_id,
            MAX(CASE WHEN is_requester THEN 1 ELSE 0 END)::int AS has_primary,
            COUNT(*)::int AS contact_count
          FROM active
          GROUP BY ticket_id
        ),
        eligible_tickets AS (
          SELECT t.id AS ticket_id
          FROM "Ticket" t
          WHERE t."workspaceId" = ${workspaceId}
            AND t."archivedAt" IS NULL
        )
        SELECT
          (SELECT COUNT(*)::int FROM eligible_tickets) AS "ticketCount",
          (SELECT COUNT(*)::int FROM ticket_rollup tr JOIN eligible_tickets et ON et.ticket_id = tr.ticket_id WHERE tr.has_primary = 1) AS "ticketsWithPrimary",
          (SELECT AVG(tr.contact_count)::double precision FROM ticket_rollup tr JOIN eligible_tickets et ON et.ticket_id = tr.ticket_id) AS "avgContactsPerTicket"
      `,
      prisma.$queryRaw`
        SELECT
          date_trunc('day', a."occurredAt")::date AS "day",
          a.type AS "type",
          (a.payload->>'kind') AS "kind",
          COUNT(*)::int AS "count"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a.type IN ('association_added', 'association_removed')
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
        GROUP BY 1, 2, 3
        ORDER BY 1 ASC, 2 ASC, 3 ASC;
      `,
      prisma.$queryRaw`
        WITH latest AS (
          SELECT DISTINCT ON (dca."dealId", dca."contactId")
            dca."dealId" AS deal_id,
            dca."contactId" AS contact_id,
            dca."archivedAt" AS archived_at,
            dca."createdAt" AS created_at
          FROM "DealContactAssociation" dca
          WHERE dca."workspaceId" = ${workspaceId}
          ORDER BY dca."dealId", dca."contactId", dca."createdAt" DESC
        ),
        active AS (
          SELECT * FROM latest WHERE archived_at IS NULL
        ),
        deal_rollup AS (
          SELECT deal_id, COUNT(*)::int AS contact_count
          FROM active
          GROUP BY deal_id
        )
        SELECT
          CASE
            WHEN contact_count <= 1 THEN '1'
            WHEN contact_count = 2 THEN '2'
            WHEN contact_count = 3 THEN '3'
            ELSE '4+'
          END AS "bucket",
          COUNT(*)::int AS "count"
        FROM deal_rollup
        GROUP BY 1
        ORDER BY
          CASE
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '1' THEN 1
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '2' THEN 2
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '3' THEN 3
            ELSE 4
          END;
      `,
      prisma.$queryRaw`
        WITH latest AS (
          SELECT DISTINCT ON (tca."ticketId", tca."contactId")
            tca."ticketId" AS ticket_id,
            tca."contactId" AS contact_id,
            tca."archivedAt" AS archived_at,
            tca."createdAt" AS created_at
          FROM "TicketContactAssociation" tca
          WHERE tca."workspaceId" = ${workspaceId}
          ORDER BY tca."ticketId", tca."contactId", tca."createdAt" DESC
        ),
        active AS (
          SELECT * FROM latest WHERE archived_at IS NULL
        ),
        ticket_rollup AS (
          SELECT ticket_id, COUNT(*)::int AS contact_count
          FROM active
          GROUP BY ticket_id
        )
        SELECT
          CASE
            WHEN contact_count <= 1 THEN '1'
            WHEN contact_count = 2 THEN '2'
            WHEN contact_count = 3 THEN '3'
            ELSE '4+'
          END AS "bucket",
          COUNT(*)::int AS "count"
        FROM ticket_rollup
        GROUP BY 1
        ORDER BY
          CASE
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '1' THEN 1
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '2' THEN 2
            WHEN (CASE
              WHEN contact_count <= 1 THEN '1'
              WHEN contact_count = 2 THEN '2'
              WHEN contact_count = 3 THEN '3'
              ELSE '4+'
            END) = '3' THEN 3
            ELSE 4
          END;
      `
    ]);

    res.status(200).json({
      dealCoverage,
      ticketCoverage,
      churnWindowDays: 30,
      churn,
      dealContactsDistribution,
      ticketContactsDistribution
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 17 -------------------------------------------------------------------
// Company analytics (GET-only). Read-only: SELECTs and projections only.
// Companies do not own Activities; metrics are derived from:
// - Contact Activities (via current active contact<->company associations)
// - Association Activities with payload.kind='contact_company'

// GET /workspaces/:workspaceId/reports/companies/activity-volume
// Company activity volume per company (7/30/90) for currently associated contacts.
app.get('/workspaces/:workspaceId/reports/companies/activity-volume', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const rows = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON (cca."companyId", cca."contactId")
          cca."companyId" AS company_id,
          cca."contactId" AS contact_id,
          cca."archivedAt" AS archived_at,
          cca."createdAt" AS created_at
        FROM "ContactCompanyAssociation" cca
        WHERE cca."workspaceId" = ${workspaceId}
        ORDER BY cca."companyId", cca."contactId", cca."createdAt" DESC
      ),
      active AS (
        SELECT * FROM latest WHERE archived_at IS NULL
      ),
      recent AS (
        SELECT a.id, a."contactId", a."occurredAt"
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '90 days')
      )
      SELECT
        c.id AS "companyId",
        c.name AS "companyName",
        COUNT(recent.id) FILTER (WHERE recent."occurredAt" >= (NOW() - INTERVAL '7 days'))::int AS "count7d",
        COUNT(recent.id) FILTER (WHERE recent."occurredAt" >= (NOW() - INTERVAL '30 days'))::int AS "count30d",
        COUNT(recent.id)::int AS "count90d"
      FROM "Company" c
      LEFT JOIN active a ON a.company_id = c.id
      LEFT JOIN recent ON recent."contactId" = a.contact_id
      WHERE c."workspaceId" = ${workspaceId}
        AND c."archivedAt" IS NULL
      GROUP BY c.id, c.name
      ORDER BY "count30d" DESC, c.name ASC, c.id ASC;
    `;

    res.status(200).json({ rows, windows: [7, 30, 90] });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/companies/last-activity
// Last Activity per company for currently associated contacts.
app.get('/workspaces/:workspaceId/reports/companies/last-activity', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const rows = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON (cca."companyId", cca."contactId")
          cca."companyId" AS company_id,
          cca."contactId" AS contact_id,
          cca."archivedAt" AS archived_at,
          cca."createdAt" AS created_at
        FROM "ContactCompanyAssociation" cca
        WHERE cca."workspaceId" = ${workspaceId}
        ORDER BY cca."companyId", cca."contactId", cca."createdAt" DESC
      ),
      active AS (
        SELECT * FROM latest WHERE archived_at IS NULL
      ),
      joined AS (
        SELECT
          c.id AS company_id,
          c.name AS company_name,
          act.id AS activity_id,
          act.type AS activity_type,
          act.subtype AS activity_subtype,
          act."occurredAt" AS occurred_at,
          act."createdAt" AS created_at
        FROM "Company" c
        LEFT JOIN active a ON a.company_id = c.id
        LEFT JOIN "Activity" act
          ON act."workspaceId" = ${workspaceId}
         AND act."contactId" = a.contact_id
        WHERE c."workspaceId" = ${workspaceId}
          AND c."archivedAt" IS NULL
      )
      SELECT DISTINCT ON (company_id)
        company_id AS "companyId",
        company_name AS "companyName",
        occurred_at AS "lastOccurredAt",
        activity_type AS "lastType",
        activity_subtype AS "lastSubtype"
      FROM joined
      ORDER BY company_id ASC, occurred_at DESC NULLS LAST, created_at DESC NULLS LAST, activity_id DESC NULLS LAST;
    `;

    res.status(200).json({ rows });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/companies/activity-mix
// Activity mix by subtype (30d) per company for currently associated contacts.
app.get('/workspaces/:workspaceId/reports/companies/activity-mix', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const rows = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON (cca."companyId", cca."contactId")
          cca."companyId" AS company_id,
          cca."contactId" AS contact_id,
          cca."archivedAt" AS archived_at,
          cca."createdAt" AS created_at
        FROM "ContactCompanyAssociation" cca
        WHERE cca."workspaceId" = ${workspaceId}
        ORDER BY cca."companyId", cca."contactId", cca."createdAt" DESC
      ),
      active AS (
        SELECT * FROM latest WHERE archived_at IS NULL
      )
      SELECT
        c.id AS "companyId",
        c.name AS "companyName",
        a.subtype AS "subtype",
        COUNT(*)::int AS "count"
      FROM "Company" c
      JOIN active ac ON ac.company_id = c.id
      JOIN "Activity" a
        ON a."workspaceId" = ${workspaceId}
       AND a."contactId" = ac.contact_id
       AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
      WHERE c."workspaceId" = ${workspaceId}
        AND c."archivedAt" IS NULL
      GROUP BY c.id, c.name, a.subtype
      ORDER BY c.name ASC, "count" DESC, a.subtype ASC;
    `;

    res.status(200).json({ windowDays: 30, rows });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/companies/contact-coverage
// Association coverage per company (active contacts, primary count, and engagement for last 30 days).
app.get('/workspaces/:workspaceId/reports/companies/contact-coverage', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const rows = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON (cca."companyId", cca."contactId")
          cca."companyId" AS company_id,
          cca."contactId" AS contact_id,
          cca."isPrimary" AS is_primary,
          cca."archivedAt" AS archived_at,
          cca."createdAt" AS created_at
        FROM "ContactCompanyAssociation" cca
        WHERE cca."workspaceId" = ${workspaceId}
        ORDER BY cca."companyId", cca."contactId", cca."createdAt" DESC
      ),
      active AS (
        SELECT * FROM latest WHERE archived_at IS NULL
      ),
      act30 AS (
        SELECT a."contactId" AS contact_id, a."occurredAt" AS occurred_at
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a."occurredAt" >= (NOW() - INTERVAL '30 days')
      )
      SELECT
        c.id AS "companyId",
        c.name AS "companyName",
        COUNT(DISTINCT ac.contact_id)::int AS "activeContacts",
        COUNT(DISTINCT ac.contact_id) FILTER (WHERE ac.is_primary = true)::int AS "primaryContacts",
        COUNT(DISTINCT ac.contact_id) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM act30 a WHERE a.contact_id = ac.contact_id
          )
        )::int AS "activeContactsWithActivity30d",
        CASE
          WHEN COUNT(DISTINCT ac.contact_id) = 0 THEN 0
          ELSE (COUNT(act30.occurred_at)::double precision / NULLIF(COUNT(DISTINCT ac.contact_id), 0)::double precision)
        END AS "avgActivitiesPerActiveContact30d"
      FROM "Company" c
      LEFT JOIN active ac ON ac.company_id = c.id
      LEFT JOIN act30 ON act30.contact_id = ac.contact_id
      WHERE c."workspaceId" = ${workspaceId}
        AND c."archivedAt" IS NULL
      GROUP BY c.id, c.name
      ORDER BY "activeContacts" DESC, c.name ASC, c.id ASC;
    `;

    res.status(200).json({ windowDays: 30, rows });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/reports/companies/growth
// Growth derived from association Activities (payload.kind='contact_company').
app.get('/workspaces/:workspaceId/reports/companies/growth', async (req, res) => {
  const { workspaceId } = req.params;
  const auth = requireReportReadAccess(req, res, { workspaceId, permissions: ['reports:read'] });
  if (!auth) return;

  try {
    const rows = await prisma.$queryRaw`
      WITH assoc_events AS (
        SELECT
          (a.payload->>'companyId') AS company_id,
          a.type AS type,
          (a.payload->>'event') AS event,
          a."occurredAt" AS occurred_at
        FROM "Activity" a
        WHERE a."workspaceId" = ${workspaceId}
          AND a.type IN ('association_added', 'association_removed')
          AND (a.payload->>'kind') = 'contact_company'
          AND (a.payload->>'companyId') IS NOT NULL
      )
      SELECT
        c.id AS "companyId",
        c.name AS "companyName",

        COUNT(*) FILTER (
          WHERE type = 'association_added'
            AND event = 'association_added'
            AND occurred_at >= (NOW() - INTERVAL '7 days')
        )::int AS "added7d",
        COUNT(*) FILTER (
          WHERE type = 'association_removed'
            AND occurred_at >= (NOW() - INTERVAL '7 days')
        )::int AS "removed7d",

        COUNT(*) FILTER (
          WHERE type = 'association_added'
            AND event = 'association_added'
            AND occurred_at >= (NOW() - INTERVAL '30 days')
        )::int AS "added30d",
        COUNT(*) FILTER (
          WHERE type = 'association_removed'
            AND occurred_at >= (NOW() - INTERVAL '30 days')
        )::int AS "removed30d",

        COUNT(*) FILTER (
          WHERE type = 'association_added'
            AND event = 'association_added'
            AND occurred_at >= (NOW() - INTERVAL '90 days')
        )::int AS "added90d",
        COUNT(*) FILTER (
          WHERE type = 'association_removed'
            AND occurred_at >= (NOW() - INTERVAL '90 days')
        )::int AS "removed90d"
      FROM "Company" c
      LEFT JOIN assoc_events e ON e.company_id = c.id
      WHERE c."workspaceId" = ${workspaceId}
        AND c."archivedAt" IS NULL
      GROUP BY c.id, c.name
      ORDER BY (
        COUNT(*) FILTER (
          WHERE type = 'association_added'
            AND event = 'association_added'
            AND occurred_at >= (NOW() - INTERVAL '30 days')
        )
        -
        COUNT(*) FILTER (
          WHERE type = 'association_removed'
            AND occurred_at >= (NOW() - INTERVAL '30 days')
        )
      ) DESC,
      c.name ASC,
      c.id ASC;
    `;

    const out = rows.map((r) => ({
      ...r,
      net7d: (r.added7d ?? 0) - (r.removed7d ?? 0),
      net30d: (r.added30d ?? 0) - (r.removed30d ?? 0),
      net90d: (r.added90d ?? 0) - (r.removed90d ?? 0)
    }));

    res.status(200).json({ windows: [7, 30, 90], rows: out });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/contacts/:contactId
app.get('/workspaces/:workspaceId/contacts/:contactId', async (req, res) => {
  const { workspaceId, contactId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'contacts' });
  if (!auth) return;

  try {
    const contact = await prisma.contact.findUnique({
      where: { workspaceId_id: { workspaceId, id: contactId } }
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.status(200).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:primaryContactId/merge
// Minimal merge for UI: archives the secondary contact and emits Activities on both.
app.post('/workspaces/:workspaceId/contacts/:primaryContactId/merge', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, primaryContactId } = req.params;
  const mergeContactId = req.body?.mergeContactId;
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  if (typeof mergeContactId !== 'string' || !mergeContactId.trim()) {
    res.status(400).json({ error: 'mergeContactId is required' });
    return;
  }
  if (mergeContactId === primaryContactId) {
    res.status(400).json({ error: 'mergeContactId must be different from primaryContactId' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const primary = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: primaryContactId } }
      });
      if (!primary) {
        const e = new Error('Primary contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (primary.archivedAt) {
        const e = new Error('Primary contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const secondary = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: mergeContactId } }
      });
      if (!secondary) {
        const e = new Error('Merge contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (secondary.archivedAt) {
        const e = new Error('Merge contact is already archived');
        e.statusCode = 409;
        throw e;
      }

      const archivedAt = nowIso();
      const updatedSecondary = await tx.contact.update({
        where: { workspaceId_id: { workspaceId, id: mergeContactId } },
        data: { archivedAt }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: primaryContactId,
          type: 'contact_merged',
          subtype: 'contact',
          actorUserId,
          payload: { mergedContactId: mergeContactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: mergeContactId,
          type: 'contact_merged',
          subtype: 'contact',
          actorUserId,
          payload: { primaryContactId, archivedAt },
          occurredAt,
          createdAt: nowIso()
        }
      });

      return { primary, merged: updatedSecondary };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts
app.post('/workspaces/:workspaceId/contacts', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId } = req.params;
  const data = pickContactFields(req.body);
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: {
          ...data,
          workspaceId,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: contact.id,
          type: 'contact_created',
          subtype: 'contact',
          actorUserId,
          payload: { contact: { ...data } },
          occurredAt,
          createdAt: nowIso()
        }
      });

      return contact;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 7 --------------------------------------------------------------------
// Automation / Workflows (reactive: consumes Activities, emits Activities)

function parseTriggerTypes(input) {
  if (!Array.isArray(input)) return null;
  const allowed = new Set(Object.values(Prisma.ActivityType));
  const out = [];
  for (const v of input) {
    if (typeof v !== 'string') return null;
    if (!allowed.has(v)) return null;
    out.push(v);
  }
  return out;
}

function parseWorkflowSteps(input) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;

  const allowedActionTypes = new Set(Object.values(Prisma.WorkflowActionType));
  const out = [];

  for (let i = 0; i < input.length; i += 1) {
    const s = input[i];
    if (!s || typeof s !== 'object') return null;

    const actionType = typeof s.actionType === 'string' ? s.actionType : null;
    if (!actionType || !allowedActionTypes.has(actionType)) return null;

    const order = typeof s.order === 'number' && Number.isInteger(s.order) ? s.order : i + 1;
    const config = s.config ?? {};

    out.push({ order, actionType, config });
  }

  return out;
}

// POST /workspaces/:workspaceId/workflows
app.post('/workspaces/:workspaceId/workflows', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const { workspaceId } = req.params;
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null;
  const triggerTypes = parseTriggerTypes(req.body?.triggerTypes);
  const steps = parseWorkflowSteps(req.body?.steps);

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!triggerTypes || triggerTypes.length < 1) return res.status(400).json({ error: 'triggerTypes must be a non-empty ActivityType[]' });
  if (!steps) return res.status(400).json({ error: 'steps must be an array (optional)' });

  try {
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name,
        triggerTypes,
        enabled: false,
        createdAt: nowIso(),
        archivedAt: null,
        steps: {
          create: steps.map((s) => ({
            order: s.order,
            actionType: s.actionType,
            config: s.config,
            createdAt: nowIso()
          }))
        }
      },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json(workflow);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/workflows/:workflowId/enable
app.post('/workspaces/:workspaceId/workflows/:workflowId/enable', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const { workspaceId, workflowId } = req.params;

  try {
    const existing = await prisma.workflow.findFirst({ where: { id: workflowId, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });
    if (existing.archivedAt) return res.status(409).json({ error: 'Workflow is archived' });

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: { enabled: true }
    });

    res.status(200).json(workflow);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/workflows/:workflowId/disable
app.post('/workspaces/:workspaceId/workflows/:workflowId/disable', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const { workspaceId, workflowId } = req.params;

  try {
    const existing = await prisma.workflow.findFirst({ where: { id: workflowId, workspaceId } });
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: { enabled: false }
    });

    res.status(200).json(workflow);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/workflows
app.get('/workspaces/:workspaceId/workflows', async (req, res) => {
  const { workspaceId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'automation' });
  if (!auth) return;

  try {
    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    res.status(200).json({ workspaceId, workflows });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// PATCH /workspaces/:workspaceId/contacts/:contactId
app.patch('/workspaces/:workspaceId/contacts/:contactId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const patch = pickContactFields(req.body);
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });

      if (!existing) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }

      if (existing.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const contact = await tx.contact.update({
        where: { workspaceId_id: { workspaceId, id: contactId } },
        data: patch
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'contact_updated',
          subtype: 'contact',
          actorUserId,
          payload: { patch },
          occurredAt,
          createdAt: nowIso()
        }
      });

      return contact;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/archive
app.post('/workspaces/:workspaceId/contacts/:contactId/archive', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });

      if (!existing) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }

      if (existing.archivedAt) {
        const e = new Error('Contact already archived');
        e.statusCode = 409;
        throw e;
      }

      const archivedAt = nowIso();
      const contact = await tx.contact.update({
        where: { workspaceId_id: { workspaceId, id: contactId } },
        data: { archivedAt }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'contact_archived',
          subtype: 'contact',
          actorUserId,
          payload: { archivedAt },
          occurredAt: archivedAt,
          createdAt: nowIso()
        }
      });

      return contact;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/contacts/:contactId/timeline
app.get('/workspaces/:workspaceId/contacts/:contactId/timeline', async (req, res) => {
  const { workspaceId, contactId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'contacts' });
  if (!auth) return;

  try {
    const contact = await prisma.contact.findUnique({
      where: { workspaceId_id: { workspaceId, id: contactId } }
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: { workspaceId, contactId },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }]
    });

    // Timeline is reconstructed from Activities only.
    res.status(200).json({ contactId, workspaceId, activities });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 2 --------------------------------------------------------------------

// POST /workspaces/:workspaceId/contact-properties
app.post('/workspaces/:workspaceId/contact-properties', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const { workspaceId } = req.params;
  const body = req.body ?? {};
  const key = body.key;
  const label = body.label;
  const type = parsePropertyType(body.type);
  const options = body.options ?? null;
  const required = body.required === true;

  if (!isSnakeCaseKey(key)) {
    res.status(400).json({ error: 'Invalid key (must be snake_case)' });
    return;
  }
  if (typeof label !== 'string' || !label.trim()) {
    res.status(400).json({ error: 'Invalid label' });
    return;
  }
  if (!type) {
    res.status(400).json({ error: 'Invalid type' });
    return;
  }
  if (type === 'enum' && !(Array.isArray(options) || (options && Array.isArray(options.values)))) {
    res.status(400).json({ error: 'Enum properties require options' });
    return;
  }

  try {
    const created = await prisma.contactPropertyDefinition.create({
      data: {
        workspaceId,
        key,
        label: label.trim(),
        type,
        options,
        required,
        createdAt: nowIso()
      }
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/contact-properties
app.get('/workspaces/:workspaceId/contact-properties', async (req, res) => {
  const { workspaceId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'contacts' });
  if (!auth) return;

  try {
    const defs = await prisma.contactPropertyDefinition.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'asc' }]
    });
    res.status(200).json(defs);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/properties/:propertyKey
app.post('/workspaces/:workspaceId/contacts/:contactId/properties/:propertyKey', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, propertyKey } = req.params;
  const incomingValue = req.body?.value;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const definition = await tx.contactPropertyDefinition.findUnique({
        where: { workspaceId_key: { workspaceId, key: propertyKey } }
      });
      if (!definition) {
        const e = new Error('Property definition not found');
        e.statusCode = 404;
        throw e;
      }

      const oldRow = await tx.contactPropertyValue.findFirst({
        where: { workspaceId, contactId, propertyKey },
        orderBy: [{ createdAt: 'desc' }]
      });
      const oldValue = oldRow ? oldRow.value : null;

      const validated = validatePropertyValue(definition, incomingValue);
      if (!validated.ok) {
        const e = new Error(validated.error);
        e.statusCode = 400;
        throw e;
      }

      const occurredAt = nowIso();

      // Activity first-class: create Activity first within the transaction.
      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'contact_property_set',
          subtype: 'contact',
          actorUserId,
          payload: { propertyKey, oldValue, newValue: validated.normalized },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const valueRow = await tx.contactPropertyValue.create({
        data: {
          workspaceId,
          contactId,
          propertyKey,
          value: validated.normalized,
          createdAt: nowIso()
        }
      });

      return { activity, value: valueRow };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// DELETE /workspaces/:workspaceId/contacts/:contactId/properties/:propertyKey
app.delete('/workspaces/:workspaceId/contacts/:contactId/properties/:propertyKey', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, propertyKey } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const definition = await tx.contactPropertyDefinition.findUnique({
        where: { workspaceId_key: { workspaceId, key: propertyKey } }
      });
      if (!definition) {
        const e = new Error('Property definition not found');
        e.statusCode = 404;
        throw e;
      }

      const oldRow = await tx.contactPropertyValue.findFirst({
        where: { workspaceId, contactId, propertyKey },
        orderBy: [{ createdAt: 'desc' }]
      });
      const oldValue = oldRow ? oldRow.value : null;

      const occurredAt = nowIso();

      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'contact_property_cleared',
          subtype: 'contact',
          actorUserId,
          payload: { propertyKey, oldValue, newValue: null },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const valueRow = await tx.contactPropertyValue.create({
        data: {
          workspaceId,
          contactId,
          propertyKey,
          value: Prisma.JsonNull,
          createdAt: nowIso()
        }
      });

      return { activity, value: valueRow };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 3 --------------------------------------------------------------------

// POST /workspaces/:workspaceId/companies
app.post('/workspaces/:workspaceId/companies', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId } = req.params;
  const fields = pickCompanyFields(req.body);

  if (typeof fields.name !== 'string' || !fields.name.trim()) {
    res.status(400).json({ error: 'Invalid company name' });
    return;
  }

  try {
    const company = await prisma.company.create({
      data: {
        workspaceId,
        name: fields.name.trim(),
        legalName: fields.legalName ?? null,
        domain: fields.domain ?? null,
        industry: fields.industry ?? null,
        sizeRange: fields.sizeRange ?? null,
        website: fields.website ?? null,
        country: fields.country ?? null,
        region: fields.region ?? null,
        archivedAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      }
    });

    res.status(201).json(company);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/companies
app.get('/workspaces/:workspaceId/companies', async (req, res) => {
  const { workspaceId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'companies' });
  if (!auth) return;

  try {
    const companies = await prisma.company.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'asc' }]
    });
    res.status(200).json(companies);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/companies/:companyId
app.get('/workspaces/:workspaceId/companies/:companyId', async (req, res) => {
  const { workspaceId, companyId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'companies' });
  if (!auth) return;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    if (!company || company.workspaceId !== workspaceId) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(200).json(company);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// PATCH /workspaces/:workspaceId/companies/:companyId
// Firmographic updates only. Companies do not own history.
app.patch('/workspaces/:workspaceId/companies/:companyId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, companyId } = req.params;
  const fields = pickCompanyFields(req.body);

  if (fields.name !== undefined && (typeof fields.name !== 'string' || !fields.name.trim())) {
    res.status(400).json({ error: 'Invalid company name' });
    return;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.company.findUnique({ where: { id: companyId } });
      if (!existing || existing.workspaceId !== workspaceId) {
        const e = new Error('Company not found');
        e.statusCode = 404;
        throw e;
      }
      if (existing.archivedAt) {
        const e = new Error('Company is archived');
        e.statusCode = 409;
        throw e;
      }

      return tx.company.update({
        where: { id: companyId },
        data: {
          ...(fields.name !== undefined ? { name: fields.name.trim() } : {}),
          ...(fields.legalName !== undefined ? { legalName: fields.legalName } : {}),
          ...(fields.domain !== undefined ? { domain: fields.domain } : {}),
          ...(fields.industry !== undefined ? { industry: fields.industry } : {}),
          ...(fields.sizeRange !== undefined ? { sizeRange: fields.sizeRange } : {}),
          ...(fields.website !== undefined ? { website: fields.website } : {}),
          ...(fields.country !== undefined ? { country: fields.country } : {}),
          ...(fields.region !== undefined ? { region: fields.region } : {}),
          updatedAt: nowIso()
        }
      });
    });

    res.status(200).json(updated);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/companies/:companyId/archive
app.post('/workspaces/:workspaceId/companies/:companyId/archive', async (req, res) => {
  res.status(405).end();
});

// GET /workspaces/:workspaceId/contacts/:contactId/companies
// Read-only projection of current associations (append-only semantics).
app.get('/workspaces/:workspaceId/contacts/:contactId/companies', async (req, res) => {
  const { workspaceId, contactId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'companies' });
  if (!auth) return;

  try {
    const contact = await prisma.contact.findUnique({
      where: { workspaceId_id: { workspaceId, id: contactId } }
    });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const rows = await prisma.contactCompanyAssociation.findMany({
      where: { workspaceId, contactId },
      orderBy: [{ createdAt: 'desc' }]
    });

    const latestByCompany = new Map();
    for (const r of rows) {
      if (!latestByCompany.has(r.companyId)) latestByCompany.set(r.companyId, r);
    }

    const active = [...latestByCompany.values()].filter((r) => r.archivedAt === null);
    const companyIds = active.map((r) => r.companyId);

    const companies = companyIds.length
      ? await prisma.company.findMany({
        where: { workspaceId, id: { in: companyIds } },
        orderBy: [{ createdAt: 'asc' }]
      })
      : [];

    const companyById = new Map(companies.map((c) => [c.id, c]));

    const out = active
      .map((a) => ({
        company: companyById.get(a.companyId) ?? null,
        role: a.role,
        isPrimary: a.isPrimary
      }))
      .filter((r) => r.company !== null);

    res.status(200).json(out);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/companies/:companyId/contacts
// Read-only projection of current associations (append-only semantics).
app.get('/workspaces/:workspaceId/companies/:companyId/contacts', async (req, res) => {
  const { workspaceId, companyId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'companies' });
  if (!auth) return;

  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.workspaceId !== workspaceId) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const rows = await prisma.contactCompanyAssociation.findMany({
      where: { workspaceId, companyId },
      orderBy: [{ createdAt: 'desc' }]
    });

    const latestByContact = new Map();
    for (const r of rows) {
      if (!latestByContact.has(r.contactId)) latestByContact.set(r.contactId, r);
    }

    const active = [...latestByContact.values()].filter((r) => r.archivedAt === null);
    const contactIds = active.map((r) => r.contactId);

    const contacts = contactIds.length
      ? await prisma.contact.findMany({
        where: { workspaceId, id: { in: contactIds } },
        orderBy: [{ createdAt: 'asc' }]
      })
      : [];

    const contactById = new Map(contacts.map((c) => [c.id, c]));

    const out = active
      .map((a) => ({
        contact: contactById.get(a.contactId) ?? null,
        role: a.role,
        isPrimary: a.isPrimary
      }))
      .filter((r) => r.contact !== null);

    res.status(200).json(out);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/companies/:companyId
app.post('/workspaces/:workspaceId/contacts/:contactId/companies/:companyId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, companyId } = req.params;
  const role = parseCompanyRole(req.body?.role);
  if (!role) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  const occurredAt = parseOccurredAt(req.body?.occurredAt);
  if (!occurredAt) {
    res.status(400).json({ error: 'Invalid occurredAt' });
    return;
  }

  const isPrimary = typeof req.body?.isPrimary === 'boolean' ? req.body.isPrimary : false;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company || company.workspaceId !== workspaceId) {
        const e = new Error('Company not found');
        e.statusCode = 404;
        throw e;
      }
      if (company.archivedAt) {
        const e = new Error('Company is archived');
        e.statusCode = 409;
        throw e;
      }

      const latest = await tx.contactCompanyAssociation.findFirst({
        where: { workspaceId, contactId, companyId },
        orderBy: [{ createdAt: 'desc' }]
      });
      if (latest && !latest.archivedAt) {
        const e = new Error('Association already active');
        e.statusCode = 409;
        throw e;
      }

      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'contact_company', companyId, role, isPrimary, event: 'association_added' },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const association = await tx.contactCompanyAssociation.create({
        data: {
          workspaceId,
          contactId,
          companyId,
          role,
          isPrimary,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      return { activity, association };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// PATCH /workspaces/:workspaceId/contacts/:contactId/companies/:companyId
// Updates association role/isPrimary via append-only rows.
app.patch('/workspaces/:workspaceId/contacts/:contactId/companies/:companyId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, companyId } = req.params;
  const role = req.body?.role === undefined ? undefined : parseCompanyRole(req.body?.role);
  const isPrimary = req.body?.isPrimary === undefined ? undefined : (typeof req.body.isPrimary === 'boolean' ? req.body.isPrimary : null);

  if (req.body?.role !== undefined && !role) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  if (req.body?.isPrimary !== undefined && isPrimary === null) {
    res.status(400).json({ error: 'Invalid isPrimary' });
    return;
  }

  const occurredAt = parseOccurredAt(req.body?.occurredAt);
  if (!occurredAt) {
    res.status(400).json({ error: 'Invalid occurredAt' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company || company.workspaceId !== workspaceId) {
        const e = new Error('Company not found');
        e.statusCode = 404;
        throw e;
      }
      if (company.archivedAt) {
        const e = new Error('Company is archived');
        e.statusCode = 409;
        throw e;
      }

      const latest = await tx.contactCompanyAssociation.findFirst({
        where: { workspaceId, contactId, companyId },
        orderBy: [{ createdAt: 'desc' }]
      });
      if (!latest || latest.archivedAt) {
        const e = new Error('No active association');
        e.statusCode = 404;
        throw e;
      }

      const nextRole = role !== undefined ? role : latest.role;
      const nextIsPrimary = isPrimary !== undefined ? isPrimary : latest.isPrimary;

      const roleChanged = nextRole !== latest.role;
      const primaryChanged = nextIsPrimary !== latest.isPrimary;
      if (!roleChanged && !primaryChanged) {
        const e = new Error('No changes');
        e.statusCode = 400;
        throw e;
      }

      const event = primaryChanged ? 'primary_set' : 'role_changed';

      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: {
            kind: 'contact_company',
            companyId,
            event,
            from: { role: latest.role, isPrimary: latest.isPrimary },
            to: { role: nextRole, isPrimary: nextIsPrimary }
          },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const association = await tx.contactCompanyAssociation.create({
        data: {
          workspaceId,
          contactId,
          companyId,
          role: nextRole,
          isPrimary: nextIsPrimary,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      return { activity, association };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// DELETE /workspaces/:workspaceId/contacts/:contactId/companies/:companyId
app.delete('/workspaces/:workspaceId/contacts/:contactId/companies/:companyId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, companyId } = req.params;

  const occurredAt = parseOccurredAt(req.body?.occurredAt);
  if (!occurredAt) {
    res.status(400).json({ error: 'Invalid occurredAt' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company || company.workspaceId !== workspaceId) {
        const e = new Error('Company not found');
        e.statusCode = 404;
        throw e;
      }

      const latest = await tx.contactCompanyAssociation.findFirst({
        where: { workspaceId, contactId, companyId },
        orderBy: [{ createdAt: 'desc' }]
      });
      if (!latest || latest.archivedAt) {
        const e = new Error('No active association');
        e.statusCode = 404;
        throw e;
      }

      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'contact_company', companyId, role: latest.role, isPrimary: latest.isPrimary, event: 'association_removed' },
          occurredAt,
          createdAt: nowIso()
        }
      });

      // Append-only + immutable associations: write a new row representing the archive.
      const archivedAssociation = await tx.contactCompanyAssociation.create({
        data: {
          workspaceId,
          contactId,
          companyId,
          role: latest.role,
          isPrimary: latest.isPrimary,
          createdAt: nowIso(),
          archivedAt: occurredAt
        }
      });

      return { activity, association: archivedAssociation };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 4 --------------------------------------------------------------------

// POST /workspaces/:workspaceId/deals
app.post('/workspaces/:workspaceId/deals', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId } = req.params;
  const fields = pickDealFields(req.body);

  if (typeof fields.name !== 'string' || !fields.name.trim()) {
    res.status(400).json({ error: 'Invalid deal name' });
    return;
  }
  if (typeof fields.pipelineId !== 'string' || !fields.pipelineId) {
    res.status(400).json({ error: 'pipelineId is required' });
    return;
  }
  if (typeof fields.stageId !== 'string' || !fields.stageId) {
    res.status(400).json({ error: 'stageId is required' });
    return;
  }
  if (typeof fields.primaryContactId !== 'string' || !fields.primaryContactId) {
    res.status(400).json({ error: 'primaryContactId is required' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.primaryContactId } }
      });
      if (!contact) {
        const e = new Error('Primary Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Primary Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const pipeline = await tx.pipeline.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.pipelineId } }
      });
      if (!pipeline) {
        const e = new Error('Pipeline not found');
        e.statusCode = 404;
        throw e;
      }

      const stage = await tx.pipelineStage.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.stageId } }
      });
      if (!stage || stage.pipelineId !== fields.pipelineId) {
        const e = new Error('Stage not found for pipeline');
        e.statusCode = 404;
        throw e;
      }

      const initialStatus = stage.isClosedWon ? 'won' : (stage.isClosedLost ? 'lost' : 'open');

      const deal = await tx.deal.create({
        data: {
          workspaceId,
          name: fields.name.trim(),
          amount: fields.amount ?? null,
          currency: fields.currency ?? null,
          pipelineId: fields.pipelineId,
          stageId: fields.stageId,
          status: initialStatus,
          archivedAt: null,
          createdAt: nowIso()
        }
      });

      await tx.dealContactAssociation.create({
        data: {
          workspaceId,
          dealId: deal.id,
          contactId: fields.primaryContactId,
          isPrimary: true,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      // Deal never owns Activity: emit to primary Contact.
      await tx.activity.create({
        data: {
          workspaceId,
          contactId: fields.primaryContactId,
          type: 'deal_created',
          subtype: 'system',
          actorUserId,
          payload: { dealId: deal.id, pipelineId: deal.pipelineId, stageId: deal.stageId },
          occurredAt: nowIso(),
          createdAt: nowIso()
        }
      });

      if (initialStatus === 'won') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: fields.primaryContactId,
            type: 'deal_won',
            subtype: 'system',
            actorUserId,
            payload: { dealId: deal.id, pipelineId: deal.pipelineId, stageId: deal.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }
      if (initialStatus === 'lost') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: fields.primaryContactId,
            type: 'deal_lost',
            subtype: 'system',
            actorUserId,
            payload: { dealId: deal.id, pipelineId: deal.pipelineId, stageId: deal.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }

      return deal;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/deals
app.get('/workspaces/:workspaceId/deals', async (req, res) => {
  const { workspaceId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'deals' });
  if (!auth) return;

  try {
    const deals = await prisma.deal.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'asc' }]
    });
    res.status(200).json(deals);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/deals/:dealId
app.get('/workspaces/:workspaceId/deals/:dealId', async (req, res) => {
  const { workspaceId, dealId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'deals' });
  if (!auth) return;

  try {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.workspaceId !== workspaceId) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }
    res.status(200).json(deal);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

async function getActivePrimaryDealContact(tx, workspaceId, dealId) {
  const rows = await tx.dealContactAssociation.findMany({
    where: { workspaceId, dealId },
    orderBy: [{ createdAt: 'desc' }]
  });

  const latestByContact = new Map();
  for (const r of rows) {
    if (!latestByContact.has(r.contactId)) latestByContact.set(r.contactId, r);
  }

  const active = [...latestByContact.values()].filter((r) => r.archivedAt === null);
  const primary = active.find((r) => r.isPrimary === true);
  return { active, primary };
}

async function getActiveRequesterTicketContact(tx, workspaceId, ticketId) {
  const rows = await tx.ticketContactAssociation.findMany({
    where: { workspaceId, ticketId },
    orderBy: [{ createdAt: 'desc' }]
  });

  const latestByContact = new Map();
  for (const r of rows) {
    if (!latestByContact.has(r.contactId)) latestByContact.set(r.contactId, r);
  }

  const active = [...latestByContact.values()].filter((r) => r.archivedAt === null);
  const requester = active.find((r) => r.isRequester === true);
  return { active, requester };
}

// POST /workspaces/:workspaceId/deals/:dealId/stage
app.post('/workspaces/:workspaceId/deals/:dealId/stage', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, dealId } = req.params;
  const stageId = req.body?.stageId;
  if (typeof stageId !== 'string' || !stageId) {
    res.status(400).json({ error: 'stageId is required' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.workspaceId !== workspaceId) {
        const e = new Error('Deal not found');
        e.statusCode = 404;
        throw e;
      }
      if (deal.archivedAt) {
        const e = new Error('Deal is archived');
        e.statusCode = 409;
        throw e;
      }

      const stage = await tx.pipelineStage.findUnique({
        where: { workspaceId_id: { workspaceId, id: stageId } }
      });
      if (!stage || stage.pipelineId !== deal.pipelineId) {
        const e = new Error('Stage not found for pipeline');
        e.statusCode = 404;
        throw e;
      }

      const { primary } = await getActivePrimaryDealContact(tx, workspaceId, dealId);
      if (!primary) {
        const e = new Error('Deal has no active primary Contact');
        e.statusCode = 409;
        throw e;
      }

      const newStatus = stage.isClosedWon ? 'won' : (stage.isClosedLost ? 'lost' : 'open');
      const updated = await tx.deal.update({
        where: { id: dealId },
        data: { stageId, status: newStatus }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: primary.contactId,
          type: 'deal_stage_changed',
          subtype: 'system',
          actorUserId,
          payload: { dealId, pipelineId: updated.pipelineId, stageId: updated.stageId },
          occurredAt: nowIso(),
          createdAt: nowIso()
        }
      });

      if (newStatus === 'won') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: primary.contactId,
            type: 'deal_won',
            subtype: 'system',
            actorUserId,
            payload: { dealId, pipelineId: updated.pipelineId, stageId: updated.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }
      if (newStatus === 'lost') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: primary.contactId,
            type: 'deal_lost',
            subtype: 'system',
            actorUserId,
            payload: { dealId, pipelineId: updated.pipelineId, stageId: updated.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }

      return updated;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/deals/:dealId/archive
app.post('/workspaces/:workspaceId/deals/:dealId/archive', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, dealId } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.workspaceId !== workspaceId) {
        const e = new Error('Deal not found');
        e.statusCode = 404;
        throw e;
      }
      if (deal.archivedAt) {
        const e = new Error('Deal already archived');
        e.statusCode = 409;
        throw e;
      }

      const { primary } = await getActivePrimaryDealContact(tx, workspaceId, dealId);
      if (!primary) {
        const e = new Error('Deal has no active primary Contact');
        e.statusCode = 409;
        throw e;
      }

      const archivedAt = nowIso();
      const updated = await tx.deal.update({
        where: { id: dealId },
        data: { archivedAt }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: primary.contactId,
          type: 'deal_archived',
          subtype: 'system',
          actorUserId,
          payload: { dealId, pipelineId: updated.pipelineId, stageId: updated.stageId },
          occurredAt: archivedAt,
          createdAt: nowIso()
        }
      });

      return updated;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/deals/:dealId/contacts/:contactId
app.post('/workspaces/:workspaceId/deals/:dealId/contacts/:contactId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, dealId, contactId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.workspaceId !== workspaceId) {
        const e = new Error('Deal not found');
        e.statusCode = 404;
        throw e;
      }
      if (deal.archivedAt) {
        const e = new Error('Deal is archived');
        e.statusCode = 409;
        throw e;
      }

      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const { primary } = await getActivePrimaryDealContact(tx, workspaceId, dealId);
      if (!primary) {
        const e = new Error('Deal has no active primary Contact');
        e.statusCode = 409;
        throw e;
      }

      const rows = await tx.dealContactAssociation.findMany({
        where: { workspaceId, dealId, contactId },
        orderBy: [{ createdAt: 'desc' }]
      });
      const latest = rows[0] ?? null;
      if (latest && latest.archivedAt === null) {
        const e = new Error('Association already active');
        e.statusCode = 409;
        throw e;
      }

      const occurredAt = nowIso();

      const activityPrimary = await tx.activity.create({
        data: {
          workspaceId,
          contactId: primary.contactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'deal_contact', dealId, pipelineId: deal.pipelineId, stageId: deal.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      let activitySecondary = null;
      if (contactId !== primary.contactId) {
        activitySecondary = await tx.activity.create({
          data: {
            workspaceId,
            contactId,
            type: 'association_added',
            subtype: 'system',
            actorUserId,
            payload: { kind: 'deal_contact', dealId, pipelineId: deal.pipelineId, stageId: deal.stageId, contactId },
            occurredAt,
            createdAt: nowIso()
          }
        });
      }

      const association = await tx.dealContactAssociation.create({
        data: {
          workspaceId,
          dealId,
          contactId,
          isPrimary: false,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      return { association, activityPrimary, activitySecondary };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// DELETE /workspaces/:workspaceId/deals/:dealId/contacts/:contactId
app.delete('/workspaces/:workspaceId/deals/:dealId/contacts/:contactId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, dealId, contactId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.workspaceId !== workspaceId) {
        const e = new Error('Deal not found');
        e.statusCode = 404;
        throw e;
      }
      if (deal.archivedAt) {
        const e = new Error('Deal is archived');
        e.statusCode = 409;
        throw e;
      }

      const { active, primary } = await getActivePrimaryDealContact(tx, workspaceId, dealId);
      if (!primary) {
        const e = new Error('Deal has no active primary Contact');
        e.statusCode = 409;
        throw e;
      }

      if (contactId === primary.contactId) {
        const e = new Error('Cannot disassociate primary Contact');
        e.statusCode = 409;
        throw e;
      }

      const rows = await tx.dealContactAssociation.findMany({
        where: { workspaceId, dealId, contactId },
        orderBy: [{ createdAt: 'desc' }]
      });
      const latest = rows[0] ?? null;
      if (!latest || latest.archivedAt !== null) {
        const e = new Error('No active association');
        e.statusCode = 404;
        throw e;
      }

      if (active.length <= 1) {
        const e = new Error('Deal must have at least one Contact');
        e.statusCode = 409;
        throw e;
      }

      const occurredAt = nowIso();

      const activityPrimary = await tx.activity.create({
        data: {
          workspaceId,
          contactId: primary.contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'deal_contact', dealId, pipelineId: deal.pipelineId, stageId: deal.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const activitySecondary = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'deal_contact', dealId, pipelineId: deal.pipelineId, stageId: deal.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      // Append-only: insert an archival row that becomes the latest state.
      const archivedAssociation = await tx.dealContactAssociation.create({
        data: {
          workspaceId,
          dealId,
          contactId,
          isPrimary: false,
          createdAt: nowIso(),
          archivedAt: occurredAt
        }
      });

      return { association: archivedAssociation, activityPrimary, activitySecondary };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 5 --------------------------------------------------------------------

// POST /workspaces/:workspaceId/tickets
app.post('/workspaces/:workspaceId/tickets', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId } = req.params;
  const fields = pickTicketFields(req.body);
  const statusParsed = fields.status ? parseCreateTicketStatus(fields.status) : { api: 'OPEN', db: 'open' };
  const priorityDb = fields.priority ? parseTicketPriority(fields.priority) : 'medium';

  const configuredPerms = getActorPermissions(actorUserId);
  if (!configuredPerms || !configuredPerms.includes('tickets:create') || !configuredPerms.includes('contacts:read')) {
    res.status(403).json({ error: 'Missing permissions: tickets:create and contacts:read are required' });
    return;
  }

  if (typeof fields.subject !== 'string' || !fields.subject.trim()) {
    res.status(400).json({ error: 'Subject is required' });
    return;
  }

  const subject = fields.subject.trim();
  if (subject.length > TICKET_SUBJECT_MAX_LEN) {
    res.status(400).json({ error: `Subject too long (max ${TICKET_SUBJECT_MAX_LEN})` });
    return;
  }

  if (!statusParsed) {
    res.status(400).json({ error: 'Invalid status (expected OPEN | PENDING | CLOSED)' });
    return;
  }

  if (!priorityDb) {
    res.status(400).json({ error: 'Invalid priority (expected LOW | MEDIUM | HIGH | URGENT)' });
    return;
  }

  if (typeof fields.primaryContactId !== 'string' || !fields.primaryContactId) {
    res.status(400).json({ error: 'primaryContactId is required' });
    return;
  }

  const additionalContactIds = Array.isArray(fields.additionalContactIds) ? fields.additionalContactIds : [];
  if (additionalContactIds.some((id) => typeof id !== 'string' || !id)) {
    res.status(400).json({ error: 'additionalContactIds must be an array of contactId strings' });
    return;
  }

  const dedupedAdditional = [...new Set(additionalContactIds)].filter((id) => id !== fields.primaryContactId);

  const dealId = typeof fields.dealId === 'string' && fields.dealId ? fields.dealId : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const primaryContact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.primaryContactId } }
      });
      if (!primaryContact) {
        const e = new Error('Primary Contact not found');
        e.statusCode = 400;
        throw e;
      }
      if (primaryContact.archivedAt) {
        const e = new Error('Primary Contact is archived');
        e.statusCode = 400;
        throw e;
      }

      for (const contactId of dedupedAdditional) {
        const c = await tx.contact.findUnique({ where: { workspaceId_id: { workspaceId, id: contactId } } });
        if (!c || c.archivedAt) {
          const e = new Error('Invalid additional contact');
          e.statusCode = 400;
          throw e;
        }
      }

      if (dealId) {
        const deal = await tx.deal.findUnique({ where: { id: dealId } });
        if (!deal || deal.workspaceId !== workspaceId || deal.archivedAt) {
          const e = new Error('Invalid dealId');
          e.statusCode = 400;
          throw e;
        }
      }

      const pipeline = await tx.ticketPipeline.findFirst({ where: { workspaceId }, orderBy: [{ order: 'asc' }] });
      if (!pipeline) {
        const e = new Error('No ticket pipeline configured');
        e.statusCode = 409;
        throw e;
      }

      const wantsClosedStage = statusParsed.db === 'closed';
      const stage = (await tx.ticketStage.findFirst({
        where: { workspaceId, pipelineId: pipeline.id, isClosed: wantsClosedStage },
        orderBy: [{ order: 'asc' }]
      })) ?? (await tx.ticketStage.findFirst({
        where: { workspaceId, pipelineId: pipeline.id },
        orderBy: [{ order: 'asc' }]
      }));

      if (!stage) {
        const e = new Error('No ticket stages configured');
        e.statusCode = 409;
        throw e;
      }

      const occurredAt = nowIso();

      const ticket = await tx.ticket.create({
        data: {
          workspaceId,
          subject,
          description: fields.description ?? null,
          priority: priorityDb,
          status: statusParsed.db,
          pipelineId: pipeline.id,
          stageId: stage.id,
          archivedAt: null,
          createdAt: nowIso()
        }
      });

      await tx.ticketContactAssociation.create({
        data: {
          workspaceId,
          ticketId: ticket.id,
          contactId: fields.primaryContactId,
          isRequester: true,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      for (const contactId of dedupedAdditional) {
        await tx.ticketContactAssociation.create({
          data: {
            workspaceId,
            ticketId: ticket.id,
            contactId,
            isRequester: false,
            createdAt: nowIso(),
            archivedAt: null
          }
        });
      }

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: fields.primaryContactId,
          type: 'ticket_created',
          subtype: 'system',
          actorUserId,
          payload: {
            ticketId: ticket.id,
            subject,
            status: statusParsed.api,
            priority: priorityDb.toUpperCase()
          },
          occurredAt,
          createdAt: nowIso()
        }
      });

      // Association Activities (Phase 12 parity)
      await tx.activity.create({
        data: {
          workspaceId,
          contactId: fields.primaryContactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'association_added', object: 'ticket', ticketId: ticket.id, contactId: fields.primaryContactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      for (const contactId of dedupedAdditional) {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId,
            type: 'association_added',
            subtype: 'system',
            actorUserId,
            payload: { kind: 'association_added', object: 'ticket', ticketId: ticket.id, contactId },
            occurredAt,
            createdAt: nowIso()
          }
        });
      }

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: fields.primaryContactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'primary_set', object: 'ticket', ticketId: ticket.id, contactId: fields.primaryContactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      return { ticketId: ticket.id };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/contacts/:contactId/associated-tickets
app.get('/workspaces/:workspaceId/contacts/:contactId/associated-tickets', async (req, res) => {
  const { workspaceId, contactId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'tickets' });
  if (!auth) return;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({ where: { workspaceId_id: { workspaceId, id: contactId } } });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }

      const rows = await tx.ticketContactAssociation.findMany({
        where: { workspaceId, contactId },
        orderBy: [{ createdAt: 'desc' }]
      });

      const latestByTicket = new Map();
      for (const r of rows) {
        if (!latestByTicket.has(r.ticketId)) latestByTicket.set(r.ticketId, r);
      }

      const active = [...latestByTicket.values()].filter((r) => r.archivedAt === null);
      const ticketIds = active.map((r) => r.ticketId);
      const tickets = ticketIds.length
        ? await tx.ticket.findMany({ where: { workspaceId, id: { in: ticketIds } } })
        : [];

      const byId = new Map(tickets.map((t) => [t.id, t]));
      const associated = active
        .map((r) => ({ ticket: byId.get(r.ticketId) ?? null, role: r.isRequester ? 'primary' : 'additional' }))
        .filter((x) => x.ticket);

      return { workspaceId, contactId, tickets: associated };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/tickets
app.get('/workspaces/:workspaceId/tickets', async (req, res) => {
  const { workspaceId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'tickets' });
  if (!auth) return;

  try {
    const tickets = await prisma.ticket.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'asc' }]
    });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/tickets/:ticketId
app.get('/workspaces/:workspaceId/tickets/:ticketId', async (req, res) => {
  const { workspaceId, ticketId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'tickets' });
  if (!auth) return;

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.workspaceId !== workspaceId) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    res.status(200).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/tickets/:ticketId/stage
app.post('/workspaces/:workspaceId/tickets/:ticketId/stage', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, ticketId } = req.params;
  const stageId = req.body?.stageId;
  if (typeof stageId !== 'string' || !stageId) {
    res.status(400).json({ error: 'stageId is required' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.workspaceId !== workspaceId) {
        const e = new Error('Ticket not found');
        e.statusCode = 404;
        throw e;
      }
      if (ticket.archivedAt) {
        const e = new Error('Ticket is archived');
        e.statusCode = 409;
        throw e;
      }

      const stage = await tx.ticketStage.findUnique({
        where: { workspaceId_id: { workspaceId, id: stageId } }
      });
      if (!stage || stage.pipelineId !== ticket.pipelineId) {
        const e = new Error('TicketStage not found for pipeline');
        e.statusCode = 404;
        throw e;
      }

      const { requester } = await getActiveRequesterTicketContact(tx, workspaceId, ticketId);
      if (!requester) {
        const e = new Error('Ticket has no active requester Contact');
        e.statusCode = 409;
        throw e;
      }

      const newStatus = stage.isClosed ? 'closed' : 'open';
      const wasClosed = ticket.status === 'closed';

      const occurredAt = nowIso();

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: requester.contactId,
          type: 'ticket_stage_changed',
          subtype: 'system',
          actorUserId,
          payload: { ticketId, pipelineId: ticket.pipelineId, stageId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { stageId, status: newStatus }
      });

      if (!wasClosed && newStatus === 'closed') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: requester.contactId,
            type: 'ticket_closed',
            subtype: 'system',
            actorUserId,
            payload: { ticketId, pipelineId: updated.pipelineId, stageId: updated.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }

      if (wasClosed && newStatus !== 'closed') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: requester.contactId,
            type: 'ticket_reopened',
            subtype: 'system',
            actorUserId,
            payload: { ticketId, pipelineId: updated.pipelineId, stageId: updated.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }

      return updated;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/tickets/:ticketId/archive
app.post('/workspaces/:workspaceId/tickets/:ticketId/archive', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, ticketId } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.workspaceId !== workspaceId) {
        const e = new Error('Ticket not found');
        e.statusCode = 404;
        throw e;
      }
      if (ticket.archivedAt) {
        const e = new Error('Ticket already archived');
        e.statusCode = 409;
        throw e;
      }

      const { requester } = await getActiveRequesterTicketContact(tx, workspaceId, ticketId);
      if (!requester) {
        const e = new Error('Ticket has no active requester Contact');
        e.statusCode = 409;
        throw e;
      }

      const archivedAt = nowIso();
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: { archivedAt }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: requester.contactId,
          type: 'ticket_archived',
          subtype: 'system',
          actorUserId,
          payload: { ticketId, pipelineId: updated.pipelineId, stageId: updated.stageId },
          occurredAt: archivedAt,
          createdAt: nowIso()
        }
      });

      return updated;
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/tickets/:ticketId/contacts/:contactId
app.post('/workspaces/:workspaceId/tickets/:ticketId/contacts/:contactId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, ticketId, contactId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.workspaceId !== workspaceId) {
        const e = new Error('Ticket not found');
        e.statusCode = 404;
        throw e;
      }
      if (ticket.archivedAt) {
        const e = new Error('Ticket is archived');
        e.statusCode = 409;
        throw e;
      }

      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: contactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (contact.archivedAt) {
        const e = new Error('Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const { requester } = await getActiveRequesterTicketContact(tx, workspaceId, ticketId);
      if (!requester) {
        const e = new Error('Ticket has no active requester Contact');
        e.statusCode = 409;
        throw e;
      }

      const rows = await tx.ticketContactAssociation.findMany({
        where: { workspaceId, ticketId, contactId },
        orderBy: [{ createdAt: 'desc' }]
      });
      const latest = rows[0] ?? null;
      if (latest && latest.archivedAt === null) {
        const e = new Error('Association already active');
        e.statusCode = 409;
        throw e;
      }

      const occurredAt = nowIso();

      const activityRequester = await tx.activity.create({
        data: {
          workspaceId,
          contactId: requester.contactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'ticket_contact', ticketId, pipelineId: ticket.pipelineId, stageId: ticket.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      let activitySecondary = null;
      if (contactId !== requester.contactId) {
        activitySecondary = await tx.activity.create({
          data: {
            workspaceId,
            contactId,
            type: 'association_added',
            subtype: 'system',
            actorUserId,
            payload: { kind: 'ticket_contact', ticketId, pipelineId: ticket.pipelineId, stageId: ticket.stageId, contactId },
            occurredAt,
            createdAt: nowIso()
          }
        });
      }

      const association = await tx.ticketContactAssociation.create({
        data: {
          workspaceId,
          ticketId,
          contactId,
          isRequester: false,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      return { association, activityRequester, activitySecondary };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// DELETE /workspaces/:workspaceId/tickets/:ticketId/contacts/:contactId
app.delete('/workspaces/:workspaceId/tickets/:ticketId/contacts/:contactId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, ticketId, contactId } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.workspaceId !== workspaceId) {
        const e = new Error('Ticket not found');
        e.statusCode = 404;
        throw e;
      }
      if (ticket.archivedAt) {
        const e = new Error('Ticket is archived');
        e.statusCode = 409;
        throw e;
      }

      const { active, requester } = await getActiveRequesterTicketContact(tx, workspaceId, ticketId);
      if (!requester) {
        const e = new Error('Ticket has no active requester Contact');
        e.statusCode = 409;
        throw e;
      }

      if (contactId === requester.contactId) {
        const e = new Error('Cannot disassociate requester Contact');
        e.statusCode = 409;
        throw e;
      }

      const rows = await tx.ticketContactAssociation.findMany({
        where: { workspaceId, ticketId, contactId },
        orderBy: [{ createdAt: 'desc' }]
      });
      const latest = rows[0] ?? null;
      if (!latest || latest.archivedAt !== null) {
        const e = new Error('No active association');
        e.statusCode = 404;
        throw e;
      }

      if (active.length <= 1) {
        const e = new Error('Ticket must have at least one Contact');
        e.statusCode = 409;
        throw e;
      }

      const occurredAt = nowIso();

      const activityRequester = await tx.activity.create({
        data: {
          workspaceId,
          contactId: requester.contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'ticket_contact', ticketId, pipelineId: ticket.pipelineId, stageId: ticket.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const activitySecondary = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'ticket_contact', ticketId, pipelineId: ticket.pipelineId, stageId: ticket.stageId, contactId },
          occurredAt,
          createdAt: nowIso()
        }
      });

      const archivedAssociation = await tx.ticketContactAssociation.create({
        data: {
          workspaceId,
          ticketId,
          contactId,
          isRequester: false,
          createdAt: nowIso(),
          archivedAt: occurredAt
        }
      });

      return { association: archivedAssociation, activityRequester, activitySecondary };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// Phase 6 --------------------------------------------------------------------

async function requireActiveContact(tx, workspaceId, contactId) {
  const contact = await tx.contact.findUnique({ where: { workspaceId_id: { workspaceId, id: contactId } } });
  if (!contact) {
    const e = new Error('Contact not found');
    e.statusCode = 404;
    throw e;
  }
  if (contact.archivedAt) {
    const e = new Error('Contact is archived');
    e.statusCode = 409;
    throw e;
  }
  return contact;
}

// POST /workspaces/:workspaceId/contacts/:contactId/tasks
app.post('/workspaces/:workspaceId/contacts/:contactId/tasks', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const title = req.body?.title;
  const dueAt = req.body?.dueAt ?? null;
  const assigneeUserId = req.body?.assigneeUserId ?? null;
  const completedAt = req.body?.completedAt ?? null;
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  try {
    const activity = await prisma.$transaction(async (tx) => {
      await requireActiveContact(tx, workspaceId, contactId);
      return tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'task_created',
          subtype: 'task',
          actorUserId,
          payload: { title: title.trim(), dueAt, assigneeUserId, completedAt },
          occurredAt,
          createdAt: nowIso()
        }
      });
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/notes
app.post('/workspaces/:workspaceId/contacts/:contactId/notes', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const body = req.body?.body;
  const mentions = req.body?.mentions ?? [];
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  if (typeof body !== 'string' || !body.trim()) {
    res.status(400).json({ error: 'body is required' });
    return;
  }
  if (!Array.isArray(mentions) || mentions.some((m) => typeof m !== 'string')) {
    res.status(400).json({ error: 'mentions must be an array of userId strings' });
    return;
  }

  try {
    const activity = await prisma.$transaction(async (tx) => {
      await requireActiveContact(tx, workspaceId, contactId);
      return tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'note_added',
          subtype: 'note',
          actorUserId,
          payload: { body: body.trim(), mentions },
          occurredAt,
          createdAt: nowIso()
        }
      });
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/emails/send
app.post('/workspaces/:workspaceId/contacts/:contactId/emails/send', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const messageId = req.body?.messageId ?? null;
  const subject = req.body?.subject ?? null;
  const to = req.body?.to ?? null;
  const cc = req.body?.cc ?? null;
  const direction = req.body?.direction ?? null;
  const provider = req.body?.provider ?? null;
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  try {
    const activity = await prisma.$transaction(async (tx) => {
      await requireActiveContact(tx, workspaceId, contactId);
      return tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'email_sent',
          subtype: 'email',
          actorUserId,
          payload: { messageId, subject, to, cc, direction, provider },
          occurredAt,
          createdAt: nowIso()
        }
      });
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/calls
app.post('/workspaces/:workspaceId/contacts/:contactId/calls', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const direction = req.body?.direction ?? null;
  const durationSeconds = req.body?.durationSeconds ?? null;
  const outcome = req.body?.outcome ?? null;
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  try {
    const activity = await prisma.$transaction(async (tx) => {
      await requireActiveContact(tx, workspaceId, contactId);
      return tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'call_logged',
          subtype: 'call',
          actorUserId,
          payload: { direction, durationSeconds, outcome },
          occurredAt,
          createdAt: nowIso()
        }
      });
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// POST /workspaces/:workspaceId/contacts/:contactId/meetings
app.post('/workspaces/:workspaceId/contacts/:contactId/meetings', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId } = req.params;
  const startAt = req.body?.startAt ?? null;
  const endAt = req.body?.endAt ?? null;
  const location = req.body?.location ?? null;
  const attendees = req.body?.attendees ?? null;
  const occurredAt = parseOccurredAt(req.body?.occurredAt) ?? nowIso();

  try {
    const activity = await prisma.$transaction(async (tx) => {
      await requireActiveContact(tx, workspaceId, contactId);
      return tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'meeting_held',
          subtype: 'meeting',
          actorUserId,
          payload: { startAt, endAt, location, attendees },
          occurredAt,
          createdAt: nowIso()
        }
      });
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/contacts/:contactId/activities
// Read-only timeline from Activity only (no joins / no derived state).
app.get('/workspaces/:workspaceId/contacts/:contactId/activities', async (req, res) => {
  const { workspaceId, contactId } = req.params;

  const auth = requireReadScope(req, res, { workspaceId, resource: 'contacts' });
  if (!auth) return;

  const limitRaw = req.query?.limit;
  const cursor = req.query?.cursor;
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : 50;
  const take = Number.isFinite(limit) ? Math.min(Math.max(1, limit), 100) : 50;

  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const contact = await prisma.contact.findUnique({ where: { workspaceId_id: { workspaceId, id: contactId } } });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: { workspaceId, contactId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(typeof cursor === 'string' && cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const nextCursor = activities.length === take ? activities[activities.length - 1].id : null;
    res.status(200).json({ workspaceId, contactId, activities, nextCursor });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Bad Request' });
  }
});

const port = Number(process.env.PORT ?? 3000);

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { priceId, seatCount, allowCoupons, lineItems } = req.body;

    if (!priceId) {
      res.status(400).json({ error: 'priceId is required' });
      return;
    }

    const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems || [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: allowCoupons === true,
      success_url: `${req.headers.origin || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/pricing`
    });

    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

app.listen(port, () => {
  // No UI. API only.
  console.log(`crm1 api listening on :${port}`);
  startAutomationEngine(prisma);
});
