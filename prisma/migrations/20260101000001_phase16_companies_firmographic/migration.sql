-- Phase 16: Companies (firmographic-only)
-- Adds firmographic fields to Company and isPrimary to ContactCompanyAssociation.

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "legalName" text,
  ADD COLUMN IF NOT EXISTS "country" text,
  ADD COLUMN IF NOT EXISTS "region" text,
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ContactCompanyAssociation"
  ADD COLUMN IF NOT EXISTS "isPrimary" boolean NOT NULL DEFAULT false;

-- Backfill updatedAt to createdAt when available.
UPDATE "Company" SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);
