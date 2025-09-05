import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface FinalizeRequest {
  manifest_id: string;
}

// Simple hex helper
async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Layout fallback used if storage config missing
const fallbackLayout = {
  page: 1,
  text: {
    manifestNumber: { x: 460, y: 730, fontSize: 10 },
    date: { x: 460, y: 712, fontSize: 10 },
    clientName: { x: 90, y: 695, fontSize: 10 },
    serviceAddress: { x: 90, y: 680, fontSize: 10 },
    cityStateZip: { x: 90, y: 665, fontSize: 10 },
    driverName: { x: 90, y: 635, fontSize: 10 },
    vehicle: { x: 280, y: 635, fontSize: 10 },
    pteOff: { x: 110, y: 560, fontSize: 10 },
    pteOn: { x: 180, y: 560, fontSize: 10 },
    c175Off: { x: 250, y: 560, fontSize: 10 },
    c175On: { x: 320, y: 560, fontSize: 10 },
    c225Off: { x: 390, y: 560, fontSize: 10 },
    c225On: { x: 460, y: 560, fontSize: 10 },
    subtotal: { x: 460, y: 200, fontSize: 10, align: "right" },
    surcharges: { x: 460, y: 184, fontSize: 10, align: "right" },
    total: { x: 460, y: 168, fontSize: 12, align: "right", bold: true },
  },
  signatures: {
    customer: { x: 110, y: 120, w: 200, h: 42 },
    driver: { x: 370, y: 120, w: 200, h: 42 },
  },
  images: {
    logo: { x: 40, y: 745, w: 90, h: 28 },
    qr: { x: 520, y: 110, w: 60, h: 60 },
  },
} as const;

type Layout = typeof fallbackLayout;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { manifest_id }: FinalizeRequest = await req.json();
    if (!manifest_id) throw new Error("Missing manifest_id");

    // Fetch manifest data within RLS of the caller
    const { data: m, error: me } = await anonClient
      .from("manifests")
      .select(
        `id, manifest_number, organization_id, client_id, pickup_id, driver_id, vehicle_id,
         pte_off_rim, pte_on_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on,
         subtotal, surcharges, total,
         customer_signature_png_path, driver_signature_png_path,
         clients:client_id(email, company_name),
         organizations:organization_id(slug),
         locations:location_id(address)`
      )
      .eq("id", manifest_id)
      .maybeSingle();

    if (me) throw me;
    if (!m) return new Response(JSON.stringify({ ok: false, error: "Manifest not found or not accessible" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Load template PDF from Storage: manifests/templates/STATE_Manifest_v1.pdf
    const templatePath = `templates/STATE_Manifest_v1.pdf`;
    const { data: tmpl, error: tmplErr } = await admin.storage.from("manifests").download(templatePath);
    if (tmplErr) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Template PDF missing. Upload /public/templates/STATE_Manifest_v1.pdf to Storage at manifests/templates/STATE_Manifest_v1.pdf",
      }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const templateBytes = new Uint8Array(await tmpl.arrayBuffer());

    // Load layout config if present
    let layout: Layout = fallbackLayout;
    const { data: layoutFile } = await admin.storage.from("manifests").download("templates/manifestLayout.json");
    if (layoutFile) {
      try {
        const json = JSON.parse(await layoutFile.text()) as Layout;
        layout = json;
      } catch (_) {
        // ignore parse errors and keep fallback
      }
    }

    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPage((layout.page || 1) - 1);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const cityStateZip = ""; // TODO derive from location if needed
    const fields: Record<string, string | number> = {
      manifestNumber: m.manifest_number,
      date: new Date().toLocaleDateString(),
      clientName: m.clients?.company_name ?? "",
      serviceAddress: (m as any).locations?.address ?? "",
      cityStateZip,
      driverName: "", // TODO join driver name
      vehicle: "", // TODO join vehicle label
      pteOff: m.pte_off_rim ?? 0,
      pteOn: m.pte_on_rim ?? 0,
      c175Off: m.commercial_17_5_19_5_off ?? 0,
      c175On: m.commercial_17_5_19_5_on ?? 0,
      c225Off: m.commercial_22_5_off ?? 0,
      c225On: m.commercial_22_5_on ?? 0,
      subtotal: m.subtotal ?? 0,
      surcharges: m.surcharges ?? 0,
      total: m.total ?? 0,
    };

    for (const [k, v] of Object.entries(layout.text)) {
      const val = fields[k];
      if (val === undefined || val === null) continue;
      const text = String(val);
      const fnt = (v as any).bold ? bold : font;
      const size = (v as any).fontSize ?? 10;
      const width = fnt.widthOfTextAtSize(text, size);
      const x = (v as any).align === "right" ? (v as any).x - width : (v as any).x;
      page.drawText(text, { x, y: (v as any).y, size, font: fnt, color: rgb(0, 0, 0) });
    }

    // signatures
    if (m.customer_signature_png_path) {
      const { data } = await admin.storage.from("manifests").download(m.customer_signature_png_path);
      if (data) {
        const img = await pdf.embedPng(new Uint8Array(await data.arrayBuffer()));
        const s = (layout.signatures as any).customer; if (s) page.drawImage(img, { x: s.x, y: s.y, width: s.w, height: s.h });
      }
    }
    if (m.driver_signature_png_path) {
      const { data } = await admin.storage.from("manifests").download(m.driver_signature_png_path);
      if (data) {
        const img = await pdf.embedPng(new Uint8Array(await data.arrayBuffer()));
        const s = (layout.signatures as any).driver; if (s) page.drawImage(img, { x: s.x, y: s.y, width: s.w, height: s.h });
      }
    }

    const pdfBytes = await pdf.save();
    const pdfHash = await sha256Hex(pdfBytes);

    // store PDF
    const orgSlug = (m as any).organizations?.slug ?? "org";
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = `manifests/${orgSlug}/${yyyy}/${mm}/${m.manifest_number}.pdf`;

    const { error: upErr } = await admin.storage
      .from("manifests")
      .upload(key, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    // update manifest (respect RLS by using caller token)
    const { error: updErr } = await anonClient
      .from("manifests")
      .update({ pdf_path: key, pdf_bytes_hash: pdfHash, status: "COMPLETED", signed_at: new Date().toISOString() })
      .eq("id", manifest_id);
    if (updErr) throw updErr;

    const { data: signed } = await admin.storage
      .from("manifests")
      .createSignedUrl(key, 60 * 60 * 24 * 7);

    // Send link-only email via existing helper
    if ((m.clients as any)?.email) {
      await admin.functions.invoke("send-manifest-email", {
        body: {
          manifest_id,
          attach: false,
          subject: `BSG Manifest ${m.manifest_number}`,
          messageHtml: signed?.signedUrl
            ? `<p>Your manifest <b>${m.manifest_number}</b> is ready. <a href="${signed.signedUrl}">Download PDF</a> (expires in 7 days)</p>`
            : undefined,
        },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, pdfPath: key, link: signed?.signedUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("manifest-finalize error", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
