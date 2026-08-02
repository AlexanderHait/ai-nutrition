export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://asgcofyqfflpvchhgtph.supabase.co";

// Publishable keys are intentionally safe for browser use. The environment
// variable remains the preferred override for independent rotation.
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_E7AYlzIIbVADw2xe_PrNkQ_HjAUlawL";
