ALTER TABLE pdf_files ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE pdf_files ADD COLUMN IF NOT EXISTS content_type VARCHAR(30) NOT NULL DEFAULT 'pdf_only';
ALTER TABLE pdf_files ADD COLUMN IF NOT EXISTS chord_content TEXT;
ALTER TABLE pdf_files ADD COLUMN IF NOT EXISTS ocr_status VARCHAR(30);
ALTER TABLE pdf_files ADD COLUMN IF NOT EXISTS ocr_started_at TIMESTAMP;
ALTER TABLE pdf_files ADD COLUMN IF NOT EXISTS ocr_error TEXT;

CREATE INDEX IF NOT EXISTS idx_pdf_files_content_type ON pdf_files(content_type);

ALTER TABLE merge_list_items ADD COLUMN IF NOT EXISTS key_override VARCHAR(10);
ALTER TABLE merge_list_items ADD COLUMN IF NOT EXISTS capo_override INT;
