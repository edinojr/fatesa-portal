-- Add extension date column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS extensao_pagamento_ate DATE;
