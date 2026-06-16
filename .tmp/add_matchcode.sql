ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "matchCode" TEXT;

WITH ordered AS (
  SELECT
    id,
    'MAT-' || EXTRACT(YEAR FROM "createdAt")::int::text || '-' ||
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY EXTRACT(YEAR FROM "createdAt")
        ORDER BY "createdAt", id
      )::text,
      6,
      '0'
    ) AS code
  FROM "Match"
)
UPDATE "Match" m
SET "matchCode" = ordered.code
FROM ordered
WHERE m.id = ordered.id
  AND m."matchCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Match_matchCode_key" ON "Match"("matchCode");
