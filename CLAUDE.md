# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server on port 8080
npm install             # Install dependencies
npm run build           # Production build
npm run build:dev       # Development mode build
npm run lint            # Run ESLint
npm run preview         # Preview production build

# Supabase Local Development
supabase start          # Start local Supabase (ports: API 54321, DB 54322, Studio 54323)
supabase stop           # Stop local Supabase
supabase db reset       # Reset local database with migrations
supabase functions serve # Serve edge functions locally
```

## Architecture Overview

**Portaria Express Smart** is a condominium management system for doormen to handle deliveries and access control, built with:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth + Storage)
- **PWA**: Progressive Web App with offline capabilities and push notifications
- **Integrations**: WhatsApp messaging via webhook API

### Database Schema

Core entities and their relationships:

- **condominios**: Buildings/condominiums with sindico (building manager) info
- **funcionarios**: Employees (doormen, admins) linked to condominiums
- **moradores**: Residents with apartment/block info
- **entregas**: Delivery records with status tracking and WhatsApp notifications
- **super_administradores**: System-wide administrators

### Authentication System

The app uses a custom authentication system (not Supabase Auth) with three user types:

1. **Super Administrators** (`super_administradores` table)
2. **Employees/Doormen** (`funcionarios` table)
3. **Building Managers/Sindicos** (stored in `condominios` table with `sindico_*` fields)

Authentication logic is in `src/hooks/useAuth.ts` and handles CPF-based login with fallback checks across all user types.

### Key Components Structure

- **Dashboard Components**: Different dashboards for different user roles
- **Admin Panels**: Building/resident/employee management interfaces
- **Delivery System**: Core delivery tracking and withdrawal functionality
- **Reports**: Analytics and reporting functionality
- **WhatsApp Integration**: Automated notification system

### Supabase Configuration

- **Local Development**: Uses local Supabase instance (see supabase/config.toml)
- **Database Migrations**: Located in `supabase/migrations/`
- **Edge Functions**: WhatsApp messaging function in `supabase/functions/`
- **Types**: Auto-generated TypeScript types in `src/integrations/supabase/types.ts`

### Webhook Configuration

WhatsApp notifications use a **hierarchical webhook system** with priority order:
1. **Condominium-specific webhook** (`condominios.webhook_url`)
2. **Global webhook** (Super Admin configuration in localStorage)
3. **Default webhook** (`https://webhook.fbzia.com.br/webhook/portariainteligente`)

Configuration is managed in `src/config/webhook.ts`:
- `getWebhookUrlForCondominium(condominio)` - Uses hierarchical logic
- `getGlobalWebhookUrl()` - Gets global/default webhook
- `setGlobalWebhookUrl(url)` - Sets global webhook (Super Admin only)

### PWA Features

- Offline functionality with service worker
- App icons and manifest configured in vite.config.ts
- Installable on mobile devices
- Custom server configuration for network access (host: 0.0.0.0, port: 8080)

## Recent Development Work

### September 2025 - Webhook & Dialog Fixes

#### Issue 1: Edit Condominium Functionality Not Working
**Problem**: Clicking edit buttons in SuperAdminDashboard had no effect - dialogs wouldn't open.

**Root Cause**:
- `handleEditCondominio()` function was setting `showEditDialog(true)` but no Dialog component existed with that state
- Form was using `condominioFormData` state but edit handler was using separate `formData` state

**Solution**:
- Updated `handleEditCondominio()` to use existing `showCreateDialog` state and `condominioFormData`
- Made dialog dynamic with conditional title ("Edit" vs "New") and button text ("Update" vs "Create")
- Updated `handleCondominioSubmit()` to handle both create/edit operations with conditional Supabase `.insert()` vs `.update()`
- Added proper state cleanup on dialog close and cancel

**Files Modified**:
- `src/components/SuperAdminDashboard.tsx` - Fixed edit functionality and dialog reuse

#### Issue 2: Webhook Configuration Not Working Hierarchically
**Problem**: Even after setting condominium-specific webhook URLs, system continued using global webhook.

**Root Cause**:
- Frontend components were calling `getWebhookUrl()` (global only) instead of `getWebhookUrlForCondominium()` (hierarchical)
- No logic to fetch condominium data and pass to webhook function

**Solution**:
- Updated all webhook-using components to import `getWebhookUrlForCondominium` instead of `getWebhookUrl`
- Added logic in each component to fetch condominium data using `user.funcionario.condominio_id`
- Implemented hierarchical webhook selection with detailed logging

**Files Modified**:
- `src/components/SimpleDeliveryForm.tsx` - Added condominium lookup and hierarchical webhook
- `src/components/WithdrawalPanel.tsx` - Added condominium lookup and hierarchical webhook
- `src/components/RemindersPanel.tsx` - Added condominium lookup and hierarchical webhook

**Implementation Pattern**:
```typescript
// Fetch condominium data
const { data: condominio } = await supabase
  .from('condominios')
  .select('*')
  .eq('id', user.funcionario.condominio_id)
  .maybeSingle();

// Use hierarchical webhook
const webhookUrl = getWebhookUrlForCondominium(condominio);
console.log('🌐 URL do webhook escolhida:', webhookUrl);
```

### Testing Notes
- Edit functionality: Create/edit condominiums through SuperAdmin interface
- Webhook hierarchy: Set different webhook URLs per condominium and verify correct URL is used via browser console logs
- All components now log which webhook URL is selected for debugging

## Development Notes

- Uses path alias `@` for `./src` directory
- No test framework currently configured
- ESLint configuration in `eslint.config.js`
- TypeScript configuration split across multiple files (tsconfig.json, tsconfig.app.json, tsconfig.node.json)
- Tailwind CSS with custom configuration in `tailwind.config.ts`
- salvar de onde paramos
- implementação logo precisa terminar