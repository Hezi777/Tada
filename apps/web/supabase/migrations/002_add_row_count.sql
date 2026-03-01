-- Add row_count column to datasets table
ALTER TABLE datasets ADD COLUMN row_count integer NOT NULL DEFAULT 0;

-- Optionally, populate existing rows with length of jsonb array
UPDATE datasets SET row_count = jsonb_array_length(rows) WHERE jsonb_typeof(rows) = 'array';
