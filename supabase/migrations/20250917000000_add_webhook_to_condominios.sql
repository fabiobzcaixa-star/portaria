-- Add webhook field to condominios table
ALTER TABLE condominios
ADD COLUMN webhook_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN condominios.webhook_url IS 'WhatsApp webhook URL específico para este condomínio. Se null, usa o webhook global do super admin.';