import { createClient } from "npm:@supabase/supabase-js@2";

// Singleton Supabase client for server-side use
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
