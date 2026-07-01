-- Migration: add modulos_finalizados_manual column to users table
-- Execute this in Supabase Dashboard SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS modulos_finalizados_manual UUID[] DEFAULT ARRAY[]::UUID[];
