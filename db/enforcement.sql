-- Phase 1 ONLY: data-layer enforcement for immutability + tenant safety.
-- Apply AFTER Prisma has created tables.

-- 1) Activities are append-only + immutable: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_activity_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Activity is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_no_update ON "Activity";
CREATE TRIGGER trg_activity_no_update
BEFORE UPDATE ON "Activity"
FOR EACH ROW
EXECUTE FUNCTION crm_activity_immutable();

DROP TRIGGER IF EXISTS trg_activity_no_delete ON "Activity";
CREATE TRIGGER trg_activity_no_delete
BEFORE DELETE ON "Activity"
FOR EACH ROW
EXECUTE FUNCTION crm_activity_immutable();

-- 2) Contacts cannot be hard-deleted (archive only).
CREATE OR REPLACE FUNCTION crm_contact_no_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Contact hard delete is forbidden (archive only)';
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_no_delete ON "Contact";
CREATE TRIGGER trg_contact_no_delete
BEFORE DELETE ON "Contact"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_no_delete();

-- 3) Activity.workspaceId must match Contact.workspaceId (defense-in-depth).
-- Note: the Prisma schema's composite FK already enforces this; this is an additional guard.
CREATE OR REPLACE FUNCTION crm_activity_workspace_matches_contact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  contact_workspace_id text;
BEGIN
  SELECT "workspaceId" INTO contact_workspace_id
  FROM "Contact"
  WHERE "id" = NEW."contactId";

  IF contact_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found for Activity.contactId=%', NEW."contactId";
  END IF;

  IF contact_workspace_id <> NEW."workspaceId" THEN
    RAISE EXCEPTION 'Cross-workspace write forbidden (Activity.workspaceId != Contact.workspaceId)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_workspace_match ON "Activity";
CREATE TRIGGER trg_activity_workspace_match
BEFORE INSERT ON "Activity"
FOR EACH ROW
EXECUTE FUNCTION crm_activity_workspace_matches_contact();

-- Phase 2 ONLY ---------------------------------------------------------------

-- 4) ContactPropertyValue is append-only: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_contact_property_value_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ContactPropertyValue is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_property_value_no_update ON "ContactPropertyValue";
CREATE TRIGGER trg_contact_property_value_no_update
BEFORE UPDATE ON "ContactPropertyValue"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_property_value_immutable();

DROP TRIGGER IF EXISTS trg_contact_property_value_no_delete ON "ContactPropertyValue";
CREATE TRIGGER trg_contact_property_value_no_delete
BEFORE DELETE ON "ContactPropertyValue"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_property_value_immutable();

-- 5) ContactPropertyDefinition cannot be hard-deleted (future archive-only if needed).
CREATE OR REPLACE FUNCTION crm_contact_property_definition_no_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ContactPropertyDefinition hard delete is forbidden';
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_property_definition_no_delete ON "ContactPropertyDefinition";
CREATE TRIGGER trg_contact_property_definition_no_delete
BEFORE DELETE ON "ContactPropertyDefinition"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_property_definition_no_delete();

-- Phase 3 ONLY ---------------------------------------------------------------

-- 6) Company cannot be hard-deleted (archive only).
CREATE OR REPLACE FUNCTION crm_company_no_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Company hard delete is forbidden (archive only)';
END;
$$;

DROP TRIGGER IF EXISTS trg_company_no_delete ON "Company";
CREATE TRIGGER trg_company_no_delete
BEFORE DELETE ON "Company"
FOR EACH ROW
EXECUTE FUNCTION crm_company_no_delete();

-- 7) ContactCompanyAssociation is append-only + immutable: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_contact_company_association_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ContactCompanyAssociation is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_company_association_no_update ON "ContactCompanyAssociation";
CREATE TRIGGER trg_contact_company_association_no_update
BEFORE UPDATE ON "ContactCompanyAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_company_association_immutable();

DROP TRIGGER IF EXISTS trg_contact_company_association_no_delete ON "ContactCompanyAssociation";
CREATE TRIGGER trg_contact_company_association_no_delete
BEFORE DELETE ON "ContactCompanyAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_contact_company_association_immutable();

-- Phase 4 ONLY ---------------------------------------------------------------

-- 8) Pipeline / PipelineStage / Deal cannot be hard-deleted (archive-only where applicable).
CREATE OR REPLACE FUNCTION crm_no_delete_generic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% hard delete is forbidden', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_pipeline_no_delete ON "Pipeline";
CREATE TRIGGER trg_pipeline_no_delete
BEFORE DELETE ON "Pipeline"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

DROP TRIGGER IF EXISTS trg_pipeline_stage_no_delete ON "PipelineStage";
CREATE TRIGGER trg_pipeline_stage_no_delete
BEFORE DELETE ON "PipelineStage"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

DROP TRIGGER IF EXISTS trg_deal_no_delete ON "Deal";
CREATE TRIGGER trg_deal_no_delete
BEFORE DELETE ON "Deal"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

-- 9) DealContactAssociation is append-only + immutable: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_deal_contact_association_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DealContactAssociation is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_contact_association_no_update ON "DealContactAssociation";
CREATE TRIGGER trg_deal_contact_association_no_update
BEFORE UPDATE ON "DealContactAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_deal_contact_association_immutable();

DROP TRIGGER IF EXISTS trg_deal_contact_association_no_delete ON "DealContactAssociation";
CREATE TRIGGER trg_deal_contact_association_no_delete
BEFORE DELETE ON "DealContactAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_deal_contact_association_immutable();

-- 10) Enforce deal has >=1 active contact and exactly one active primary.
-- Active/primary are computed from the latest row per (dealId, contactId) (append-only semantics).
CREATE OR REPLACE FUNCTION crm_assert_deal_contact_invariants(p_workspace_id text, p_deal_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  active_count integer;
  primary_count integer;
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON ("dealId", "contactId")
      "dealId", "contactId", "isPrimary", "archivedAt"
    FROM "DealContactAssociation"
    WHERE "workspaceId" = p_workspace_id AND "dealId" = p_deal_id
    ORDER BY "dealId", "contactId", "createdAt" DESC
  )
  SELECT
    COUNT(*) FILTER (WHERE "archivedAt" IS NULL),
    COUNT(*) FILTER (WHERE "archivedAt" IS NULL AND "isPrimary" = true)
  INTO active_count, primary_count
  FROM latest;

  IF active_count < 1 THEN
    RAISE EXCEPTION 'Deal must have at least one active Contact association';
  END IF;

  IF primary_count <> 1 THEN
    RAISE EXCEPTION 'Deal must have exactly one active primary Contact (found=%)', primary_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION crm_deal_contact_invariants_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ws text;
  did text;
BEGIN
  ws := COALESCE(NEW."workspaceId", OLD."workspaceId");
  did := COALESCE(NEW."dealId", OLD."dealId", NEW."id", OLD."id");

  PERFORM crm_assert_deal_contact_invariants(ws, did);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Deferrable so Deal + its first association can be created in one transaction.
DROP TRIGGER IF EXISTS trg_deal_invariants_deferred ON "Deal";
CREATE CONSTRAINT TRIGGER trg_deal_invariants_deferred
AFTER INSERT OR UPDATE ON "Deal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION crm_deal_contact_invariants_trigger();

DROP TRIGGER IF EXISTS trg_deal_contact_assoc_invariants_deferred ON "DealContactAssociation";
CREATE CONSTRAINT TRIGGER trg_deal_contact_assoc_invariants_deferred
AFTER INSERT ON "DealContactAssociation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION crm_deal_contact_invariants_trigger();

-- Phase 5 ONLY ---------------------------------------------------------------

-- 11) Ticket / TicketPipeline / TicketStage cannot be hard-deleted (archive-only where applicable).
DROP TRIGGER IF EXISTS trg_ticket_pipeline_no_delete ON "TicketPipeline";
CREATE TRIGGER trg_ticket_pipeline_no_delete
BEFORE DELETE ON "TicketPipeline"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

DROP TRIGGER IF EXISTS trg_ticket_stage_no_delete ON "TicketStage";
CREATE TRIGGER trg_ticket_stage_no_delete
BEFORE DELETE ON "TicketStage"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

DROP TRIGGER IF EXISTS trg_ticket_no_delete ON "Ticket";
CREATE TRIGGER trg_ticket_no_delete
BEFORE DELETE ON "Ticket"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

-- 12) TicketContactAssociation is append-only + immutable: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_ticket_contact_association_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'TicketContactAssociation is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_contact_association_no_update ON "TicketContactAssociation";
CREATE TRIGGER trg_ticket_contact_association_no_update
BEFORE UPDATE ON "TicketContactAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_ticket_contact_association_immutable();

DROP TRIGGER IF EXISTS trg_ticket_contact_association_no_delete ON "TicketContactAssociation";
CREATE TRIGGER trg_ticket_contact_association_no_delete
BEFORE DELETE ON "TicketContactAssociation"
FOR EACH ROW
EXECUTE FUNCTION crm_ticket_contact_association_immutable();

-- 13) Enforce ticket has >=1 active contact and exactly one active requester.
-- Active/requester are computed from the latest row per (ticketId, contactId) (append-only semantics).
CREATE OR REPLACE FUNCTION crm_assert_ticket_contact_invariants(p_workspace_id text, p_ticket_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  active_count integer;
  requester_count integer;
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON ("ticketId", "contactId")
      "ticketId", "contactId", "isRequester", "archivedAt"
    FROM "TicketContactAssociation"
    WHERE "workspaceId" = p_workspace_id AND "ticketId" = p_ticket_id
    ORDER BY "ticketId", "contactId", "createdAt" DESC
  )
  SELECT
    COUNT(*) FILTER (WHERE "archivedAt" IS NULL),
    COUNT(*) FILTER (WHERE "archivedAt" IS NULL AND "isRequester" = true)
  INTO active_count, requester_count
  FROM latest;

  IF active_count < 1 THEN
    RAISE EXCEPTION 'Ticket must have at least one active Contact association';
  END IF;

  IF requester_count <> 1 THEN
    RAISE EXCEPTION 'Ticket must have exactly one active requester Contact (found=%)', requester_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION crm_ticket_contact_invariants_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ws text;
  tid text;
BEGIN
  ws := COALESCE(NEW."workspaceId", OLD."workspaceId");
  tid := COALESCE(NEW."ticketId", OLD."ticketId", NEW."id", OLD."id");

  PERFORM crm_assert_ticket_contact_invariants(ws, tid);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_invariants_deferred ON "Ticket";
CREATE CONSTRAINT TRIGGER trg_ticket_invariants_deferred
AFTER INSERT OR UPDATE ON "Ticket"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION crm_ticket_contact_invariants_trigger();

DROP TRIGGER IF EXISTS trg_ticket_contact_assoc_invariants_deferred ON "TicketContactAssociation";
CREATE CONSTRAINT TRIGGER trg_ticket_contact_assoc_invariants_deferred
AFTER INSERT ON "TicketContactAssociation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION crm_ticket_contact_invariants_trigger();

-- Phase 7 ONLY ---------------------------------------------------------------

-- 14) Workflow / WorkflowStep cannot be hard-deleted (archive optional on Workflow).
DROP TRIGGER IF EXISTS trg_workflow_no_delete ON "Workflow";
CREATE TRIGGER trg_workflow_no_delete
BEFORE DELETE ON "Workflow"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

DROP TRIGGER IF EXISTS trg_workflow_step_no_delete ON "WorkflowStep";
CREATE TRIGGER trg_workflow_step_no_delete
BEFORE DELETE ON "WorkflowStep"
FOR EACH ROW
EXECUTE FUNCTION crm_no_delete_generic();

-- 15) WorkflowExecution is append-only + immutable: no UPDATE, no DELETE.
CREATE OR REPLACE FUNCTION crm_workflow_execution_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'WorkflowExecution is immutable: % is forbidden', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_execution_no_update ON "WorkflowExecution";
CREATE TRIGGER trg_workflow_execution_no_update
BEFORE UPDATE ON "WorkflowExecution"
FOR EACH ROW
EXECUTE FUNCTION crm_workflow_execution_immutable();

DROP TRIGGER IF EXISTS trg_workflow_execution_no_delete ON "WorkflowExecution";
CREATE TRIGGER trg_workflow_execution_no_delete
BEFORE DELETE ON "WorkflowExecution"
FOR EACH ROW
EXECUTE FUNCTION crm_workflow_execution_immutable();

-- 16) Tenant safety: WorkflowExecution must reference Activity+Contact from the same workspace as Workflow.
CREATE OR REPLACE FUNCTION crm_workflow_execution_workspace_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wf_workspace_id text;
  activity_workspace_id text;
  contact_workspace_id text;
BEGIN
  SELECT "workspaceId" INTO wf_workspace_id
  FROM "Workflow"
  WHERE "id" = NEW."workflowId";

  IF wf_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workflow not found for WorkflowExecution.workflowId=%', NEW."workflowId";
  END IF;

  SELECT "workspaceId" INTO activity_workspace_id
  FROM "Activity"
  WHERE "id" = NEW."activityId";

  IF activity_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Activity not found for WorkflowExecution.activityId=%', NEW."activityId";
  END IF;

  SELECT "workspaceId" INTO contact_workspace_id
  FROM "Contact"
  WHERE "id" = NEW."contactId";

  IF contact_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found for WorkflowExecution.contactId=%', NEW."contactId";
  END IF;

  IF wf_workspace_id <> activity_workspace_id OR wf_workspace_id <> contact_workspace_id THEN
    RAISE EXCEPTION 'Cross-workspace write forbidden (WorkflowExecution references mismatched workspace)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workflow_execution_workspace_guard ON "WorkflowExecution";
CREATE TRIGGER trg_workflow_execution_workspace_guard
BEFORE INSERT ON "WorkflowExecution"
FOR EACH ROW
EXECUTE FUNCTION crm_workflow_execution_workspace_guard();
