-- Attendance System Migration
-- Table to store daily attendance records
CREATE TABLE IF NOT EXISTS public.frequencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id),
    nucleo_id UUID NOT NULL REFERENCES public.nucleos(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('P', 'F')),
    compartilhado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(aluno_id, data)
);

-- RLS Policies
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;

-- Professors can view and manage attendance for their own nuclei
CREATE POLICY "Professors can manage attendance in their nuclei" 
ON public.frequencia FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.professor_nucleo pn
        WHERE pn.professor_id = auth.uid() 
        AND pn.nucleo_id = public.frequencia.nucleo_id
    )
);

-- Admins can view everything
CREATE POLICY "Admins can view all attendance" 
ON public.frequencia FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Students can view their own attendance
CREATE POLICY "Students can view their own attendance" 
ON public.frequencia FOR SELECT 
USING (aluno_id = auth.uid());
