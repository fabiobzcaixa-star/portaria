-- Create storage bucket for package photos
INSERT INTO storage.buckets (id, name, public) VALUES 
('package-photos', 'package-photos', false);

-- Create storage policies for package photos
CREATE POLICY "Funcionarios podem visualizar fotos de encomendas" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'package-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT condominio_id::text 
    FROM public.funcionarios 
    WHERE cpf = current_setting('app.current_user_cpf', true)
  )
);

CREATE POLICY "Funcionarios podem fazer upload de fotos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'package-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT condominio_id::text 
    FROM public.funcionarios 
    WHERE cpf = current_setting('app.current_user_cpf', true)
  )
);

-- Add description field to entregas table
ALTER TABLE public.entregas ADD COLUMN descricao_retirada TEXT;