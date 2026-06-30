// supabase-config.js
// Initialise and export the Supabase Client.

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_PUBLIC_KEY") {
  console.warn(
    "Supabase configuration is missing or using placeholders. " +
    "Please configure your credentials in 'env.js'."
  );
}

if (!window.supabase) {
  throw new Error("Supabase SDK is not loaded. Please ensure the Supabase CDN script tag is included in the HTML.");
}

// Create the Supabase Client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
