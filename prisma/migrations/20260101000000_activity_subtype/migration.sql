-- Adds Activity.subtype and removes legacy Activity.externalMessageId (if present)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivitySubtype') THEN
    CREATE TYPE "ActivitySubtype" AS ENUM (
      'contact',
      'task',
      'note',
      'email',
      'call',
      'meeting',
      'system'
    );
  END IF;
END $$;

ALTER TABLE "Activity"
  ADD COLUMN IF NOT EXISTS "subtype" "ActivitySubtype" NOT NULL DEFAULT 'system';

-- Legacy dedupe field removed in Phase 9
ALTER TABLE "Activity"
  DROP COLUMN IF EXISTS "externalMessageId";

-- Prisma typically created this unique index; keep it safe even if it never existed.
DROP INDEX IF EXISTS "Activity_workspaceId_externalMessageId_key";
DROP INDEX IF EXISTS "Activity_externalMessageId_key";
