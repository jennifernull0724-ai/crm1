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
    if (typeof input.domain === 'string' || input.domain === null) out.domain = input.domain;
    if (typeof input.industry === 'string' || input.industry === null) out.industry = input.industry;
    if (typeof input.sizeRange === 'string' || input.sizeRange === null) out.sizeRange = input.sizeRange;
    if (typeof input.website === 'string' || input.website === null) out.website = input.website;
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
    if (typeof input.pipelineId === 'string') out.pipelineId = input.pipelineId;
    if (typeof input.stageId === 'string') out.stageId = input.stageId;
    if (typeof input.requesterContactId === 'string') out.requesterContactId = input.requesterContactId;
  }
  return out;
}

function parseTicketPriority(input) {
  if (typeof input !== 'string') return null;
  const p = input.trim();
  if (p === 'low' || p === 'medium' || p === 'high' || p === 'urgent') return p;
  return null;
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

// Phase 1 reads --------------------------------------------------------------

// GET /workspaces/:workspaceId/contacts
app.get('/workspaces/:workspaceId/contacts', async (req, res) => {
  const { workspaceId } = req.params;
  const includeArchived = req.query?.includeArchived === 'true';

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

// GET /workspaces/:workspaceId/contacts/:contactId
app.get('/workspaces/:workspaceId/contacts/:contactId', async (req, res) => {
  const { workspaceId, contactId } = req.params;

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
  const emitToContactId = req.body?.contactId;

  if (typeof fields.name !== 'string' || !fields.name.trim()) {
    res.status(400).json({ error: 'Invalid company name' });
    return;
  }
  if (typeof emitToContactId !== 'string' || !emitToContactId) {
    res.status(400).json({ error: 'contactId is required for Activity emission' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: emitToContactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found for Activity emission');
        e.statusCode = 404;
        throw e;
      }

      const company = await tx.company.create({
        data: {
          workspaceId,
          name: fields.name.trim(),
          domain: fields.domain ?? null,
          industry: fields.industry ?? null,
          sizeRange: fields.sizeRange ?? null,
          website: fields.website ?? null,
          archivedAt: null,
          createdAt: nowIso()
        }
      });

      // Company never owns Activity: emit to a Contact.
      await tx.activity.create({
        data: {
          workspaceId,
          contactId: emitToContactId,
          type: 'company_created',
          subtype: 'system',
          actorUserId,
          payload: { companyId: company.id },
          occurredAt: nowIso(),
          createdAt: nowIso()
        }
      });

      return company;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/companies
app.get('/workspaces/:workspaceId/companies', async (req, res) => {
  const { workspaceId } = req.params;
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

// POST /workspaces/:workspaceId/companies/:companyId/archive
app.post('/workspaces/:workspaceId/companies/:companyId/archive', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, companyId } = req.params;
  const emitToContactId = req.body?.contactId;

  if (typeof emitToContactId !== 'string' || !emitToContactId) {
    res.status(400).json({ error: 'contactId is required for Activity emission' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: emitToContactId } }
      });
      if (!contact) {
        const e = new Error('Contact not found for Activity emission');
        e.statusCode = 404;
        throw e;
      }

      const company = await tx.company.findUnique({ where: { id: companyId } });
      if (!company || company.workspaceId !== workspaceId) {
        const e = new Error('Company not found');
        e.statusCode = 404;
        throw e;
      }
      if (company.archivedAt) {
        const e = new Error('Company already archived');
        e.statusCode = 409;
        throw e;
      }

      const archivedAt = nowIso();
      const updated = await tx.company.update({
        where: { id: companyId },
        data: { archivedAt }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: emitToContactId,
          type: 'company_archived',
          subtype: 'system',
          actorUserId,
          payload: { companyId, archivedAt },
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

      const occurredAt = nowIso();
      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_added',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'contact_company', companyId, role },
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

// DELETE /workspaces/:workspaceId/contacts/:contactId/companies/:companyId
app.delete('/workspaces/:workspaceId/contacts/:contactId/companies/:companyId', async (req, res) => {
  if (rejectDemoMockSample(req, res)) return;

  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  const { workspaceId, contactId, companyId } = req.params;

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

      const occurredAt = nowIso();
      const activity = await tx.activity.create({
        data: {
          workspaceId,
          contactId,
          type: 'association_removed',
          subtype: 'system',
          actorUserId,
          payload: { kind: 'contact_company', companyId, role: latest.role },
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
  const priority = parseTicketPriority(fields.priority);

  if (typeof fields.subject !== 'string' || !fields.subject.trim()) {
    res.status(400).json({ error: 'Invalid subject' });
    return;
  }
  if (!priority) {
    res.status(400).json({ error: 'Invalid priority' });
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
  if (typeof fields.requesterContactId !== 'string' || !fields.requesterContactId) {
    res.status(400).json({ error: 'requesterContactId is required' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const requesterContact = await tx.contact.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.requesterContactId } }
      });
      if (!requesterContact) {
        const e = new Error('Requester Contact not found');
        e.statusCode = 404;
        throw e;
      }
      if (requesterContact.archivedAt) {
        const e = new Error('Requester Contact is archived');
        e.statusCode = 409;
        throw e;
      }

      const pipeline = await tx.ticketPipeline.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.pipelineId } }
      });
      if (!pipeline) {
        const e = new Error('TicketPipeline not found');
        e.statusCode = 404;
        throw e;
      }

      const stage = await tx.ticketStage.findUnique({
        where: { workspaceId_id: { workspaceId, id: fields.stageId } }
      });
      if (!stage || stage.pipelineId !== fields.pipelineId) {
        const e = new Error('TicketStage not found for pipeline');
        e.statusCode = 404;
        throw e;
      }

      const initialStatus = stage.isClosed ? 'closed' : 'open';

      const ticket = await tx.ticket.create({
        data: {
          workspaceId,
          subject: fields.subject.trim(),
          description: fields.description ?? null,
          priority,
          status: initialStatus,
          pipelineId: fields.pipelineId,
          stageId: fields.stageId,
          archivedAt: null,
          createdAt: nowIso()
        }
      });

      await tx.ticketContactAssociation.create({
        data: {
          workspaceId,
          ticketId: ticket.id,
          contactId: fields.requesterContactId,
          isRequester: true,
          createdAt: nowIso(),
          archivedAt: null
        }
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: fields.requesterContactId,
          type: 'ticket_created',
          subtype: 'system',
          actorUserId,
          payload: { ticketId: ticket.id, pipelineId: ticket.pipelineId, stageId: ticket.stageId },
          occurredAt: nowIso(),
          createdAt: nowIso()
        }
      });

      if (initialStatus === 'closed') {
        await tx.activity.create({
          data: {
            workspaceId,
            contactId: fields.requesterContactId,
            type: 'ticket_closed',
            subtype: 'system',
            actorUserId,
            payload: { ticketId: ticket.id, pipelineId: ticket.pipelineId, stageId: ticket.stageId },
            occurredAt: nowIso(),
            createdAt: nowIso()
          }
        });
      }

      return ticket;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode ?? 400).json({ error: err.message ?? 'Bad Request' });
  }
});

// GET /workspaces/:workspaceId/tickets
app.get('/workspaces/:workspaceId/tickets', async (req, res) => {
  const { workspaceId } = req.params;
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
app.listen(port, () => {
  // No UI. API only.
  console.log(`crm1 api listening on :${port}`);
  startAutomationEngine(prisma);
});
