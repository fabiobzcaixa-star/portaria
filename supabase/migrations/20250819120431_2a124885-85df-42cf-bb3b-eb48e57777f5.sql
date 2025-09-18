-- Create condominios table
CREATE TABLE public.condominios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  cep TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create funcionarios table
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  senha TEXT NOT NULL,
  cargo TEXT NOT NULL DEFAULT 'porteiro',
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create moradores table
CREATE TABLE public.moradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  apartamento TEXT NOT NULL,
  bloco TEXT,
  telefone TEXT NOT NULL,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entregas table
CREATE TABLE public.entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  morador_id UUID NOT NULL REFERENCES public.moradores(id) ON DELETE CASCADE,
  codigo_retirada TEXT NOT NULL,
  foto_url TEXT,
  mensagem_enviada BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'retirada', 'cancelada')),
  data_entrega TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_retirada TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for funcionarios
CREATE POLICY "Funcionarios podem fazer login" 
ON public.funcionarios 
FOR SELECT 
USING (true);

-- Create RLS policies for condominios
CREATE POLICY "Funcionarios podem ver condominios" 
ON public.condominios 
FOR SELECT 
USING (true);

-- Create RLS policies for moradores
CREATE POLICY "Funcionarios podem ver moradores" 
ON public.moradores 
FOR SELECT 
USING (true);

-- Create RLS policies for entregas
CREATE POLICY "Funcionarios podem ver entregas" 
ON public.entregas 
FOR SELECT 
USING (true);

CREATE POLICY "Funcionarios podem criar entregas" 
ON public.entregas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Funcionarios podem atualizar entregas" 
ON public.entregas 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_funcionarios_cpf ON public.funcionarios(cpf);
CREATE INDEX idx_funcionarios_condominio ON public.funcionarios(condominio_id);
CREATE INDEX idx_moradores_apartamento ON public.moradores(apartamento, bloco, condominio_id);
CREATE INDEX idx_moradores_condominio ON public.moradores(condominio_id);
CREATE INDEX idx_entregas_funcionario ON public.entregas(funcionario_id);
CREATE INDEX idx_entregas_morador ON public.entregas(morador_id);
CREATE INDEX idx_entregas_status ON public.entregas(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_condominios_updated_at
  BEFORE UPDATE ON public.condominios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_moradores_updated_at
  BEFORE UPDATE ON public.moradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entregas_updated_at
  BEFORE UPDATE ON public.entregas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data
INSERT INTO public.condominios (nome, endereco, cidade, cep, telefone) VALUES
('Residencial Vista Bela', 'Rua das Flores, 123', 'São Paulo', '01234-567', '(11) 3456-7890');

-- Get the condominio ID for the next inserts
WITH condominio_data AS (
  SELECT id as condominio_id FROM public.condominios WHERE nome = 'Residencial Vista Bela' LIMIT 1
)
-- Insert test funcionario
INSERT INTO public.funcionarios (cpf, nome, senha, cargo, condominio_id)
SELECT '12345678901', 'João Silva', '123456', 'porteiro', condominio_id
FROM condominio_data;

-- Insert test moradores for apartment 1905
WITH condominio_data AS (
  SELECT id as condominio_id FROM public.condominios WHERE nome = 'Residencial Vista Bela' LIMIT 1
)
INSERT INTO public.moradores (nome, apartamento, bloco, telefone, condominio_id)
SELECT * FROM (VALUES
  ('Fabio Brito Zissou', '1905', 'A', '(11) 99999-1111'),
  ('Sofia de Jesus Zissou', '1905', 'A', '(11) 99999-2222'),
  ('Nicollas de Jesus Zissou', '1905', 'A', '(11) 99999-3333')
) AS moradores_data(nome, apartamento, bloco, telefone)
CROSS JOIN condominio_data;