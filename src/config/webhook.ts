// Hierarchical webhook configuration: condominium-specific > global > default
// Usage: import { getWebhookUrl, setGlobalWebhookUrl, getWebhookUrlForCondominium } from "@/config/webhook";

import type { Tables } from '@/integrations/supabase/types';

const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_DEFAULT_WEBHOOK_URL || 'https://webhook.fbzia.com.br/webhook/portariainteligente';
const GLOBAL_STORAGE_KEY = 'global_webhook_url';

type Condominio = Tables<'condominios'>;

/**
 * Get webhook URL for a specific condominium
 * Priority: condominium.webhook_url > global webhook > default webhook
 */
export function getWebhookUrlForCondominium(condominio: Condominio | null): string {
	// 1. Use condominium-specific webhook if available
	if (condominio?.webhook_url?.trim()) {
		return condominio.webhook_url.trim();
	}

	// 2. Fall back to global webhook
	return getGlobalWebhookUrl();
}

/**
 * Get global webhook URL (used by super admin and as fallback)
 */
export function getGlobalWebhookUrl(): string {
	try {
		const stored = localStorage.getItem(GLOBAL_STORAGE_KEY);
		if (stored && stored.startsWith('http')) {
			return stored;
		}
		return DEFAULT_WEBHOOK_URL;
	} catch {
		return DEFAULT_WEBHOOK_URL;
	}
}

/**
 * Set global webhook URL (super admin configuration)
 */
export function setGlobalWebhookUrl(url: string): void {
	const normalized = url.trim();
	if (!normalized) return;
	localStorage.setItem(GLOBAL_STORAGE_KEY, normalized);
}

/**
 * Reset global webhook URL to default
 */
export function resetGlobalWebhookUrl(): void {
	localStorage.removeItem(GLOBAL_STORAGE_KEY);
}

// Legacy functions for backward compatibility
export const getWebhookUrl = getGlobalWebhookUrl;
export const setWebhookUrl = setGlobalWebhookUrl;
export const resetWebhookUrl = resetGlobalWebhookUrl;


