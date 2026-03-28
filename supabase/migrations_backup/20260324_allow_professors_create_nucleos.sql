-- Allow Professors to create (INSERT) Nucleos
CREATE POLICY "Professores podem criar nucleos" ON public.nucleos 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND tipo = 'professor')
);

-- Allow Professors to update (UPDATE) Nucleos they are linked to
CREATE POLICY "Professores podem gerenciar seus proprios nucleos" ON public.nucleos 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.professor_nucleo WHERE professor_id = auth.uid() AND nucleo_id = public.nucleos.id)
);
