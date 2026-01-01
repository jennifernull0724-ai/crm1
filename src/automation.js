import { Prisma } from '@prisma/client';
import crypto from 'crypto';

const AUTOMATION_ACTOR_USER_ID = 'automation';

const TRIGGER_TYPES = new Set([
  'contact_created',
  'deal_stage_changed',
  'ticket_closed',
  'task_completed',
  'email_opened'
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function emitAutomationActivity(prisma, {
  workspaceId,
  contactId,
  type,
  payload,
  occurredAt
}) {
  return prisma.activity.create({
    data: {
      workspaceId,
      contactId,
      type,
      subtype: 'system',
      actorUserId: AUTOMATION_ACTOR_USER_ID,
      payload,
      occurredAt,
      createdAt: new Date()
    }
  });
}

async function runStep(prisma, { workflow, step, triggerActivity }) {
  const workspaceId = triggerActivity.workspaceId;
  const contactId = triggerActivity.contactId;
  const occurredAt = new Date();

  if (step.actionType === 'delay') {
    const seconds = typeof step.config?.seconds === 'number' ? step.config.seconds : null;
    const ms = typeof step.config?.ms === 'number' ? step.config.ms : null;
    const delayMs = ms ?? (seconds != null ? Math.floor(seconds * 1000) : null);

    if (delayMs == null || delayMs < 0) {
      throw new Error('Invalid delay config (expected seconds or ms)');
    }

    await sleep(delayMs);
    return;
  }

  if (step.actionType === 'create_task') {
    await emitAutomationActivity(prisma, {
      workspaceId,
      contactId,
      type: 'automation_task_created',
      occurredAt,
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        task: step.config ?? {}
      }
    });

    return;
  }

  if (step.actionType === 'send_internal_notification') {
    await emitAutomationActivity(prisma, {
      workspaceId,
      contactId,
      type: 'automation_internal_notification_sent',
      occurredAt,
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        notification: step.config ?? {}
      }
    });

    return;
  }

  if (step.actionType === 'set_contact_property') {
    const propertyKey = typeof step.config?.propertyKey === 'string' ? step.config.propertyKey : null;
    const value = step.config?.value;

    if (!propertyKey) {
      throw new Error('Invalid set_contact_property config (propertyKey required)');
    }

    const def = await prisma.contactPropertyDefinition.findUnique({
      where: { workspaceId_key: { workspaceId, key: propertyKey } }
    });

    if (!def) {
      throw new Error(`ContactPropertyDefinition not found for key=${propertyKey}`);
    }

    // Minimal type check mirroring API behavior.
    // (We intentionally avoid duplicating full validation here.)
    if (def.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
      throw new Error('Invalid value type for number property');
    }
    if (def.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error('Invalid value type for boolean property');
    }
    if (def.type === 'string' && typeof value !== 'string') {
      throw new Error('Invalid value type for string property');
    }
    if (def.type === 'date' && typeof value !== 'string') {
      throw new Error('Invalid value type for date property (expected ISO string)');
    }
    if (def.type === 'enum' && typeof value !== 'string') {
      throw new Error('Invalid value type for enum property (expected string)');
    }

    const latest = await prisma.contactPropertyValue.findFirst({
      where: { workspaceId, contactId, propertyKey },
      orderBy: { createdAt: 'desc' }
    });

    const isSameValue = latest ? JSON.stringify(latest.value) === JSON.stringify(value) : false;

    if (!isSameValue) {
      await prisma.contactPropertyValue.create({
        data: {
          workspaceId,
          contactId,
          propertyKey,
          value,
          createdAt: new Date()
        }
      });
    }

    await emitAutomationActivity(prisma, {
      workspaceId,
      contactId,
      type: 'automation_property_updated',
      occurredAt,
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        propertyKey,
        value
      }
    });

    return;
  }

  if (step.actionType === 'associate_company') {
    const companyId = typeof step.config?.companyId === 'string' ? step.config.companyId : null;
    const role = typeof step.config?.role === 'string' ? step.config.role : 'other';

    if (!companyId) {
      throw new Error('Invalid associate_company config (companyId required)');
    }

    const latest = await prisma.contactCompanyAssociation.findFirst({
      where: { workspaceId, contactId, companyId },
      orderBy: { createdAt: 'desc' }
    });

    const isCurrentlyAssociated = latest ? latest.archivedAt == null : false;

    if (!isCurrentlyAssociated) {
      await prisma.contactCompanyAssociation.create({
        data: {
          workspaceId,
          contactId,
          companyId,
          role,
          createdAt: new Date(),
          archivedAt: null
        }
      });
    }

    await emitAutomationActivity(prisma, {
      workspaceId,
      contactId,
      type: 'automation_company_associated',
      occurredAt,
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        companyId,
        role
      }
    });

    return;
  }

  throw new Error(`Unsupported WorkflowActionType: ${step.actionType}`);
}

async function tryCreateExecution(prisma, data) {
  try {
    return await prisma.workflowExecution.create({ data });
  } catch (err) {
    // Idempotency/uniqueness: (workflowId, activityId)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return null;
    }
    throw err;
  }
}

async function executeWorkflowForActivity(prisma, workflow, triggerActivity) {
  const idempotencyKey = sha256(`${workflow.id}:${triggerActivity.id}`);

  const existing = await prisma.workflowExecution.findUnique({
    where: { workflowId_activityId: { workflowId: workflow.id, activityId: triggerActivity.id } }
  });

  if (existing) return;

  const occurredAt = new Date();

  if (!workflow.enabled || workflow.archivedAt) {
    await tryCreateExecution(prisma, {
      workflowId: workflow.id,
      activityId: triggerActivity.id,
      contactId: triggerActivity.contactId,
      status: 'skipped',
      executedAt: occurredAt,
      idempotencyKey
    });

    await emitAutomationActivity(prisma, {
      workspaceId: triggerActivity.workspaceId,
      contactId: triggerActivity.contactId,
      type: 'automation_execution_skipped',
      occurredAt,
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        reason: workflow.archivedAt ? 'archived' : 'disabled'
      }
    });

    return;
  }

  try {
    const steps = await prisma.workflowStep.findMany({
      where: { workflowId: workflow.id },
      orderBy: { order: 'asc' }
    });

    for (const step of steps) {
      await runStep(prisma, { workflow, step, triggerActivity });
    }

    const created = await tryCreateExecution(prisma, {
      workflowId: workflow.id,
      activityId: triggerActivity.id,
      contactId: triggerActivity.contactId,
      status: 'success',
      executedAt: new Date(),
      idempotencyKey
    });

    if (created) {
      await emitAutomationActivity(prisma, {
        workspaceId: triggerActivity.workspaceId,
        contactId: triggerActivity.contactId,
        type: 'automation_execution_succeeded',
        occurredAt: new Date(),
        payload: {
          workflowId: workflow.id,
          triggerActivityId: triggerActivity.id
        }
      });
    }
  } catch (err) {
    await tryCreateExecution(prisma, {
      workflowId: workflow.id,
      activityId: triggerActivity.id,
      contactId: triggerActivity.contactId,
      status: 'failed',
      executedAt: new Date(),
      idempotencyKey
    });

    await emitAutomationActivity(prisma, {
      workspaceId: triggerActivity.workspaceId,
      contactId: triggerActivity.contactId,
      type: 'automation_execution_failed',
      occurredAt: new Date(),
      payload: {
        workflowId: workflow.id,
        triggerActivityId: triggerActivity.id,
        error: err?.message ?? 'Workflow execution failed'
      }
    });
  }
}

export function startAutomationEngine(prisma, {
  pollIntervalMs = 1500,
  batchSize = 100,
  initialLookbackMs = 5 * 60 * 1000
} = {}) {
  let lastCreatedAt = new Date(Date.now() - initialLookbackMs);
  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;

    try {
      const activities = await prisma.activity.findMany({
        where: {
          createdAt: { gt: lastCreatedAt },
          type: { in: Array.from(TRIGGER_TYPES) }
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize
      });

      for (const a of activities) {
        lastCreatedAt = a.createdAt;

        const workflows = await prisma.workflow.findMany({
          where: {
            workspaceId: a.workspaceId,
            triggerTypes: { has: a.type }
          },
          select: { id: true, enabled: true, archivedAt: true }
        });

        for (const wf of workflows) {
          await executeWorkflowForActivity(prisma, wf, a);
        }
      }
    } catch {
      // Engine is best-effort; failures are recorded per-workflow execution.
    } finally {
      running = false;
    }
  }, pollIntervalMs);

  return () => clearInterval(timer);
}
