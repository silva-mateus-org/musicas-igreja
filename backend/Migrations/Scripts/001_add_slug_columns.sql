-- Add slug columns to filterable entities

ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
ALTER TABLE liturgical_times ADD COLUMN IF NOT EXISTS slug VARCHAR(200);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS slug VARCHAR(200);

-- Populate slugs for existing rows using a simplified ASCII conversion
-- (the app's SaveChanges will handle proper slug generation on next update)
UPDATE categories SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;
UPDATE liturgical_times SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;
UPDATE artists SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;
ALTER TABLE liturgical_times ALTER COLUMN slug SET NOT NULL;
ALTER TABLE artists ALTER COLUMN slug SET NOT NULL;

-- Add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_liturgical_times_slug ON liturgical_times(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
