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

// Field formatters
const formatField = (value: any, format?: string): string => {
  if (value === null || value === undefined) return "";
  
  switch (format) {
    case "int":
      return String(Number(value) || 0);
    case "currency":
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(Number(value) || 0);
    case "date":
      return new Date(value).toLocaleDateString('en-US');
    default:
      return String(value);
  }
};

// Default field mappings (loaded from config or fallback)
const defaultFieldMappings: FieldMap = {
  manifestNumber: { source: "manifest_number" },
  date: { source: "created_at", format: "date" },
  clientName: { source: "company_name" },
  serviceAddress: { source: "address" },
  cityStateZip: { source: "address" },
  driverName: { source: "driver_name" },
  vehicle: { source: "vehicle_name" },
  pteOff: { source: "pte_off_rim", format: "int" },
  pteOn: { source: "pte_on_rim", format: "int" },
  c175Off: { source: "commercial_17_5_19_5_off", format: "int" },
  c175On: { source: "commercial_17_5_19_5_on", format: "int" },
  c225Off: { source: "commercial_22_5_off", format: "int" },
  c225On: { source: "commercial_22_5_on", format: "int" },
  subtotal: { source: "subtotal", format: "currency" },
  surcharges: { source: "surcharges", format: "currency" },
  total: { source: "total", format: "currency" }
};

// Simple hex helper
async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Default layout coordinates (from manifestLayout.json)
const defaultLayout: Layout = {
  page: 1,
  text: {
    manifestNumber: { x: 460, y: 730, fontSize: 10, align: "right" },
    date: { x: 460, y: 712, fontSize: 10, align: "right" },
    clientName: { x: 90, y: 695, fontSize: 10 },
    serviceAddress: { x: 90, y: 680, fontSize: 10 },
    cityStateZip: { x: 90, y: 665, fontSize: 10 },
    driverName: { x: 90, y: 635, fontSize: 10 },
    vehicle: { x: 280, y: 635, fontSize: 10 },
    pteOff: { x: 110, y: 560, fontSize: 10, align: "center" },
    pteOn: { x: 180, y: 560, fontSize: 10, align: "center" },
    c175Off: { x: 250, y: 560, fontSize: 10, align: "center" },
    c175On: { x: 320, y: 560, fontSize: 10, align: "center" },
    c225Off: { x: 390, y: 560, fontSize: 10, align: "center" },
    c225On: { x: 460, y: 560, fontSize: 10, align: "center" },
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
};

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
        `id, manifest_number, organization_id, client_id, pickup_id, driver_id, vehicle_id, location_id, created_at,
         pte_off_rim, pte_on_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on,
         subtotal, surcharges, total,
         customer_signature_png_path, driver_signature_png_path`
      )
      .eq("id", manifest_id)
      .maybeSingle();

    if (me) throw me;
    if (!m) return new Response(JSON.stringify({ ok: false, error: "Manifest not found or not accessible" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Fetch related info including driver and vehicle names
    const [{ data: client }, { data: org }, { data: loc }, { data: driver }, { data: vehicle }] = await Promise.all([
      admin.from("clients").select("email, company_name").eq("id", m.client_id).maybeSingle(),
      admin.from("organizations").select("slug").eq("id", m.organization_id).maybeSingle(),
      m.location_id ? admin.from("locations").select("address").eq("id", m.location_id).maybeSingle() : Promise.resolve({ data: null }),
      m.driver_id ? admin.from("users").select("first_name, last_name").eq("id", m.driver_id).maybeSingle() : Promise.resolve({ data: null }),
      m.vehicle_id ? admin.from("vehicles").select("name").eq("id", m.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

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

    // Load configurations from Storage or use defaults
    let fieldMappings: FieldMap = defaultFieldMappings;
    let layout: Layout = defaultLayout;

    // Try to load field mappings config
    const { data: fieldsFile } = await admin.storage.from("manifests").download("config/manifestFields.json");
    if (fieldsFile) {
      try {
        fieldMappings = JSON.parse(await fieldsFile.text()) as FieldMap;
      } catch (e) {
        console.log('Using default field mappings due to parsing error:', e);
      }
    }

    // Try to load layout config
    const { data: layoutFile } = await admin.storage.from("manifests").download("config/manifestLayout.json");
    if (layoutFile) {
      try {
        layout = JSON.parse(await layoutFile.text()) as Layout;
      } catch (e) {
        console.log('Using default layout due to parsing error:', e);
      }
    }

    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPage((layout.page || 1) - 1);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Build data object for field mapping
    const dataRow = {
      manifest_number: m.manifest_number,
      created_at: m.created_at,
      company_name: client?.company_name || "",
      address: loc?.address || "",
      driver_name: driver ? `${driver.first_name} ${driver.last_name}` : "",
      vehicle_name: vehicle?.name || "",
      pte_off_rim: m.pte_off_rim || 0,
      pte_on_rim: m.pte_on_rim || 0,
      commercial_17_5_19_5_off: m.commercial_17_5_19_5_off || 0,
      commercial_17_5_19_5_on: m.commercial_17_5_19_5_on || 0,
      commercial_22_5_off: m.commercial_22_5_off || 0,
      commercial_22_5_on: m.commercial_22_5_on || 0,
      subtotal: m.subtotal || 0,
      surcharges: m.surcharges || 0,
      total: m.total || 0,
    };

    // Apply field mappings and formatting
    const fields: Record<string, string> = {};
    for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
      const rawValue = (dataRow as any)[mapping.source];
      fields[fieldId] = formatField(rawValue, mapping.format);
    }

    // Validate all required fields exist
    const requiredFields = Object.keys(layout.text);
    const missingFields = requiredFields.filter(field => 
      !fields[field] || fields[field].trim() === '' || fields[field] === 'null'
    );

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing required fields', 
        missing: missingFields,
        available: Object.keys(fields)
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Draw text overlays with proper positioning
    for (const [fieldId, spec] of Object.entries(layout.text)) {
      const value = fields[fieldId];
      if (!value) continue;

      const textFont = spec.bold ? bold : font;
      const fontSize = spec.fontSize || 10;
      
      let x = spec.x;
      if (spec.align === 'right') {
        const textWidth = textFont.widthOfTextAtSize(value, fontSize);
        x = spec.x - textWidth;
      } else if (spec.align === 'center') {
        const textWidth = textFont.widthOfTextAtSize(value, fontSize);
        x = spec.x - textWidth / 2;
      }

      page.drawText(value, {
        x,
        y: spec.y,
        size: fontSize,
        font: textFont,
        color: rgb(0, 0, 0)
      });
    }

    // Embed signatures if available
    if (m.customer_signature_png_path) {
      try {
        const { data } = await admin.storage.from("manifests").download(m.customer_signature_png_path);
        if (data) {
          const img = await pdf.embedPng(new Uint8Array(await data.arrayBuffer()));
          const sigSpec = layout.signatures.customer;
          page.drawImage(img, { 
            x: sigSpec.x, 
            y: sigSpec.y, 
            width: sigSpec.w, 
            height: sigSpec.h 
          });
        }
      } catch (e) {
        console.error('Error embedding customer signature:', e);
      }
    }
    
    if (m.driver_signature_png_path) {
      try {
        const { data } = await admin.storage.from("manifests").download(m.driver_signature_png_path);
        if (data) {
          const img = await pdf.embedPng(new Uint8Array(await data.arrayBuffer()));
          const sigSpec = layout.signatures.driver;
          page.drawImage(img, { 
            x: sigSpec.x, 
            y: sigSpec.y, 
            width: sigSpec.w, 
            height: sigSpec.h 
          });
        }
      } catch (e) {
        console.error('Error embedding driver signature:', e);
      }
    }

    const pdfBytes = await pdf.save();
    const pdfHash = await sha256Hex(pdfBytes);

    // store PDF
    const orgSlug = org?.slug ?? "org";
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
    if (client?.email && signed?.signedUrl) {
      try {
        await admin.functions.invoke("send-manifest-email", {
          body: {
            manifest_id,
            attach: false,
            subject: `BSG Manifest ${m.manifest_number}`,
            messageHtml: `<p>Your manifest <b>${m.manifest_number}</b> is ready. <a href="${signed.signedUrl}">Download PDF</a> (expires in 7 days)</p>`,
          },
        });
      } catch (emailError) {
        console.error('Email send failed:', emailError);
        // Don't fail the request if email fails
      }
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
