-- Migration: Add bloco_id to aulas table
-- Purpose: Groups aulas into content blocks (2 lessons + 2 exercises + 1 video per block)
-- The video aula in a block is auto-unlocked when all lessons + exercises of the block are completed.

ALTER TABLE aulas ADD COLUMN IF NOT EXISTS bloco_id INTEGER;

-- Index for performance when querying by bloco_id within a livro
CREATE INDEX IF NOT EXISTS idx_aulas_bloco_id ON aulas(bloco_id);
CREATE INDEX IF NOT EXISTS idx_aulas_livro_bloco ON aulas(livro_id, bloco_id);

COMMENT ON COLUMN aulas.bloco_id IS
  'Groups content items into blocks. Items with the same bloco_id form a learning block. '
  'Video aulas (tipo=gravada) in a block are auto-unlocked when all other items in the same block are completed.';
