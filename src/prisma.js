import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const base = new PrismaClient();

// Phase 1+2 enforcement at the data-access layer (defense-in-depth; DB triggers are also provided).
export const prisma = base.$extends({
  query: {
    activity: {
      update() {
        throw new Error('Activity is append-only and immutable');
      },
      updateMany() {
        throw new Error('Activity is append-only and immutable');
      },
      delete() {
        throw new Error('Activity is append-only and immutable');
      },
      deleteMany() {
        throw new Error('Activity is append-only and immutable');
      }
    },
    contact: {
      delete() {
        throw new Error('Contact hard delete is forbidden (archive only)');
      },
      deleteMany() {
        throw new Error('Contact hard delete is forbidden (archive only)');
      }
    },
    contactPropertyValue: {
      update() {
        throw new Error('ContactPropertyValue is append-only and immutable');
      },
      updateMany() {
        throw new Error('ContactPropertyValue is append-only and immutable');
      },
      delete() {
        throw new Error('ContactPropertyValue is append-only and immutable');
      },
      deleteMany() {
        throw new Error('ContactPropertyValue is append-only and immutable');
      }
    },
    contactPropertyDefinition: {
      delete() {
        throw new Error('ContactPropertyDefinition hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('ContactPropertyDefinition hard delete is forbidden');
      }
    },
    company: {
      delete() {
        throw new Error('Company hard delete is forbidden (archive only)');
      },
      deleteMany() {
        throw new Error('Company hard delete is forbidden (archive only)');
      }
    },
    contactCompanyAssociation: {
      update() {
        throw new Error('ContactCompanyAssociation is append-only and immutable');
      },
      updateMany() {
        throw new Error('ContactCompanyAssociation is append-only and immutable');
      },
      delete() {
        throw new Error('ContactCompanyAssociation is append-only and immutable');
      },
      deleteMany() {
        throw new Error('ContactCompanyAssociation is append-only and immutable');
      }
    },
    pipeline: {
      delete() {
        throw new Error('Pipeline hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('Pipeline hard delete is forbidden');
      }
    },
    pipelineStage: {
      delete() {
        throw new Error('PipelineStage hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('PipelineStage hard delete is forbidden');
      }
    },
    deal: {
      delete() {
        throw new Error('Deal hard delete is forbidden (archive only)');
      },
      deleteMany() {
        throw new Error('Deal hard delete is forbidden (archive only)');
      }
    },
    dealContactAssociation: {
      update() {
        throw new Error('DealContactAssociation is append-only and immutable');
      },
      updateMany() {
        throw new Error('DealContactAssociation is append-only and immutable');
      },
      delete() {
        throw new Error('DealContactAssociation is append-only and immutable');
      },
      deleteMany() {
        throw new Error('DealContactAssociation is append-only and immutable');
      }
    },
    ticketPipeline: {
      delete() {
        throw new Error('TicketPipeline hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('TicketPipeline hard delete is forbidden');
      }
    },
    ticketStage: {
      delete() {
        throw new Error('TicketStage hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('TicketStage hard delete is forbidden');
      }
    },
    ticket: {
      delete() {
        throw new Error('Ticket hard delete is forbidden (archive only)');
      },
      deleteMany() {
        throw new Error('Ticket hard delete is forbidden (archive only)');
      }
    },
    ticketContactAssociation: {
      update() {
        throw new Error('TicketContactAssociation is append-only and immutable');
      },
      updateMany() {
        throw new Error('TicketContactAssociation is append-only and immutable');
      },
      delete() {
        throw new Error('TicketContactAssociation is append-only and immutable');
      },
      deleteMany() {
        throw new Error('TicketContactAssociation is append-only and immutable');
      }
    },
    workflow: {
      delete() {
        throw new Error('Workflow hard delete is forbidden (archive only)');
      },
      deleteMany() {
        throw new Error('Workflow hard delete is forbidden (archive only)');
      }
    },
    workflowStep: {
      delete() {
        throw new Error('WorkflowStep hard delete is forbidden');
      },
      deleteMany() {
        throw new Error('WorkflowStep hard delete is forbidden');
      }
    },
    workflowExecution: {
      update() {
        throw new Error('WorkflowExecution is append-only and immutable');
      },
      updateMany() {
        throw new Error('WorkflowExecution is append-only and immutable');
      },
      delete() {
        throw new Error('WorkflowExecution is append-only and immutable');
      },
      deleteMany() {
        throw new Error('WorkflowExecution is append-only and immutable');
      }
    }
  }
});
