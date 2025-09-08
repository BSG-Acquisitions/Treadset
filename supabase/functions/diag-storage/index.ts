// Supabase Edge Function: diag-storage
// Purpose: Credit-saver diagnostics for Storage & envs
// Notes:
// - Public GET endpoint
// - Never logs or returns secrets
// - Tests template download and a small write

import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "";
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const bucket = Deno.env.get("PDF_BUCKET") || "manifests";

  const result: Record<string, unknown> = {
    ok: false,
    hasUrl: Boolean(url),
    hasAnon: Boolean(anon),
    hasServiceKey: Boolean(svc),
    bucket,
    templateExists: false,
    writeTestOk: false,
    errors: [] as string[],
  };

  try {
    if (!url || !svc) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

    // Server-only client with Service Role for storage diagnostics
    const supa = createClient(url, svc);

    // Check template exists
    const templateKey = "templates/STATE_Manifest_v1.pdf";
    const tpl = await supa.storage.from(bucket).download(templateKey);
    result.templateExists = Boolean(tpl.data) && !tpl.error;
    if (tpl.error) (result.errors as string[]).push(`download: ${tpl.error.message}`);

    // Try a small write
    const up = await supa.storage
      .from(bucket)
      .upload("diag/_ok.txt", new TextEncoder().encode("ok"), {
        upsert: true,
        contentType: "text/plain",
      });
    result.writeTestOk = !up.error;
    if (up.error) (result.errors as string[]).push(`upload: ${up.error.message}`);

    (result as any).ok = (result.templateExists as boolean) && (result.writeTestOk as boolean);
  } catch (e) {
    (result.errors as string[]).push(e instanceof Error ? e.message : String(e));
  }

  const status = (result.ok as boolean) ? 200 : 500;
  return new Response(JSON.stringify(result), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
