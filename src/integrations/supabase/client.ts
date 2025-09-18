import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ofaifvyowixzktwvxrps.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYWlmdnlvd2l4emt0d3Z4cnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwNjAsImV4cCI6MjA3MTE4MDA2MH0.SpckVh5t9J5d34RiyXEwHvv_ZKR6G_qXXoxlCjYjauM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'portaria-app'
    }
  }
});