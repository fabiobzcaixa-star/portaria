-- Add sindico_id column to condominios table
ALTER TABLE public.condominios
ADD COLUMN sindico_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- Optional: Add a check constraint to ensure sindico_id points to an 'administrador' role
-- This requires a function to be created first, so we'll omit for now for simplicity
-- and rely on application logic to ensure correct assignment.
