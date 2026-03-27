
-- 1. Add new user types to the user_tipo enum
-- Note: PostgreSQL doesn't allow adding enum values inside a transaction easily in older versions, 
-- but Supabase/Postgres 12+ allows it with ALTER TYPE ... ADD VALUE.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'super_visitante') THEN
        ALTER TYPE user_tipo ADD VALUE 'super_visitante';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'ex_aluno') THEN
        ALTER TYPE user_tipo ADD VALUE 'ex_aluno';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_tipo' AND e.enumlabel = 'colaborador') THEN
        ALTER TYPE user_tipo ADD VALUE 'colaborador';
    END IF;
END
$$;
