-- Adicionar campo para tracking de lembretes enviados
ALTER TABLE entregas 
ADD COLUMN ultimo_lembrete_enviado TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN entregas.ultimo_lembrete_enviado IS 'Data e hora do último lembrete enviado para esta entrega';