import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendManifestEmailRequest = {
  to?: string | string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  messageHtml?: string;
  // Provide either manifest_id (to auto-fetch) or explicit pdf_path + to/email
  manifest_id?: string;
  pdf_path?: string; // e.g. manifests/2025-01-01/manifest-123.pdf
  attach?: boolean; // default true; when false, send link-only
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SendManifestEmailRequest;
    console.log("Incoming payload", body);

    let toList: string[] = [];
    let subject = body.subject ?? "Your Manifest";
    let html =
      body.messageHtml ??
      `<h2>Manifest</h2><p>Attached is your manifest PDF.</p>`;

    let pdfPath = body.pdf_path ?? null as string | null;
    let attachment: { filename: string; content: Uint8Array; contentType: string } | null = null;

    // If manifest_id is provided, fetch details (client email, pdf_path, etc.)
    if (body.manifest_id) {
      const { data: manifest, error } = await supabase
        .from("manifests")
        .select(
          `id, manifest_number, pdf_path, total, signed_at, client_id, organization_id,
           clients:client_id(email, company_name)`
        )
        .eq("id", body.manifest_id)
        .maybeSingle();

      if (error) throw error;
      if (!manifest) throw new Error("Manifest not found");

      // Determine recipient
      if (manifest.clients?.email) toList.push(manifest.clients.email);

      // Prefer manifest_number in subject if available
      if (manifest.manifest_number) {
        subject = body.subject ?? `Manifest ${manifest.manifest_number}`;
      }

      // Prefer saved pdf_path
      if (manifest.pdf_path) pdfPath = manifest.pdf_path;

      // Simple default HTML if none provided (link-only or attachment)
      if (!body.messageHtml) {
        const company = manifest.clients?.company_name ?? "Customer";
        const number = manifest.manifest_number ?? manifest.id;
        const total = manifest.total ?? 0;
        const signed = manifest.signed_at ? new Date(manifest.signed_at).toLocaleString() : "N/A";
        html = `
          <h2>Manifest ${number}</h2>
          <p>Hi ${company},</p>
          <p>Your manifest is ready. Details:</p>
          <ul>
            <li><strong>Manifest #</strong>: ${number}</li>
            <li><strong>Signed At</strong>: ${signed}</li>
            <li><strong>Total</strong>: $${Number(total).toFixed(2)}</li>
          </ul>
          ${body.attach === false ? '<p><strong>Download:</strong> See secure link below.</p>' : '<p>The PDF is attached to this email.</p>'}
        `;
      }
    }

    // If explicit recipients provided, merge them
    if (body.to) {
      toList = toList.concat(Array.isArray(body.to) ? body.to : [body.to]);
    }

    if (!toList.length) {
      throw new Error("No recipient email found. Provide 'to' or a manifest with client email.");
    }

    // If we have a PDF path
    let signedUrl: string | undefined
    if (pdfPath) {
      if (body.attach === false) {
        // link-only: create signed URL
        const { data: signed, error: urlErr } = await supabase.storage
          .from("manifests")
          .createSignedUrl(pdfPath, 60 * 60 * 24 * 7);
        if (urlErr) {
          console.error("Failed to create signed URL:", urlErr);
        } else {
          signedUrl = signed?.signedUrl;
          // If HTML not provided, append link
          if (!body.messageHtml) {
            html += signedUrl ? `<p><a href="${signedUrl}">Download PDF (expires in 7 days)</a></p>` : ''
          }
        }
      } else {
        // default: attach the file
        console.log("Downloading PDF from storage:", pdfPath);
        const { data: pdfData, error: dlErr } = await supabase.storage
          .from("manifests")
          .download(pdfPath);

        if (dlErr) {
          console.error("Failed to download PDF:", dlErr);
        } else {
          const buf = new Uint8Array(await pdfData.arrayBuffer());
          // Attempt to derive filename from path
          const parts = pdfPath.split("/");
          const filename = parts[parts.length - 1] || "manifest.pdf";
          attachment = {
            filename,
            content: buf,
            contentType: "application/pdf",
          };
        }
      }
    }

    // Send email via Resend
    const emailPayload: any = {
      from: "BSG Logistics <admin@bsglogistics.com>", // Updated to use company domain
      to: toList,
      subject,
      html,
    };

    if (body.cc?.length) emailPayload.cc = body.cc;
    if (body.bcc?.length) emailPayload.bcc = body.bcc;
    if (attachment) emailPayload.attachments = [attachment];

    const sent = await resend.emails.send(emailPayload);
    console.log("Resend response:", sent);

    return new Response(JSON.stringify({ ok: true, sent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-manifest-email:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
