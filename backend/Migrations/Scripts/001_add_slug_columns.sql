-- Add slug columns to filterable entities

ALTER TABLE categories ADD COLUMN slug VARCHAR(200) NULL AFTER name;
ALTER TABLE liturgical_times ADD COLUMN slug VARCHAR(200) NULL AFTER name;
ALTER TABLE artists ADD COLUMN slug VARCHAR(200) NULL AFTER name;

-- Populate slugs for existing rows using a simplified ASCII conversion
-- (the app's SaveChanges will handle proper slug generation on next update)
UPDATE categories SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;
UPDATE liturgical_times SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;
UPDATE artists SET slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ã', 'a'), 'á', 'a'), 'â', 'a'), 'é', 'e'), 'ê', 'e'), 'í', 'i'), 'ó', 'o'), 'ô', 'o'), 'ú', 'u'), 'ç', 'c'), ' ', '-')) WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE categories MODIFY COLUMN slug VARCHAR(200) NOT NULL;
ALTER TABLE liturgical_times MODIFY COLUMN slug VARCHAR(200) NOT NULL;
ALTER TABLE artists MODIFY COLUMN slug VARCHAR(200) NOT NULL;

-- Add unique indexes
CREATE UNIQUE INDEX idx_categories_slug ON categories(slug);
CREATE UNIQUE INDEX idx_liturgical_times_slug ON liturgical_times(slug);
CREATE UNIQUE INDEX idx_artists_slug ON artists(slug);
