-- Remove PT certificates completely as per user request (2026-09-18)
ALTER TABLE pt_profiles DROP CONSTRAINT IF EXISTS pt_certificates_structure;
DROP FUNCTION IF EXISTS valid_pt_certificates(jsonb);
ALTER TABLE pt_profiles DROP COLUMN IF EXISTS certificates;
