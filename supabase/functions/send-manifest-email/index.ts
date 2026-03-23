import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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

  let parsedBody: SendManifestEmailRequest | null = null;

  try {
    parsedBody = (await req.json()) as SendManifestEmailRequest;
    const body = parsedBody;
    console.log("Incoming payload", body);

    let toList: string[] = [];
    let subject = body.subject ?? "Your Manifest";
    let html =
      body.messageHtml ??
      `<h2>Manifest</h2><p>Attached is your manifest PDF.</p>`;

    let pdfPath = body.pdf_path ?? null as string | null;
    let attachment: { filename: string; content: Uint8Array; contentType: string } | null = null;

    // Track org name for dynamic branding
    let orgName = 'Your Service Provider';
    // If manifest_id is provided, fetch details (client email, pdf_path, etc.)
    if (body.manifest_id) {
      const { data: manifest, error } = await supabase
        .from("manifests")
        .select(
          `id, manifest_number, pdf_path, acroform_pdf_path, total, signed_at, client_id, organization_id`
        )
        .eq("id", body.manifest_id)
        .maybeSingle();

      if (error) throw error;
      if (!manifest) throw new Error("Manifest not found");

      // Fetch org name for dynamic branding
      const { data: orgData } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", manifest.organization_id)
        .single();
      if (orgData?.name) orgName = orgData.name;

      // Fetch client details separately to avoid reliance on embedded relationships
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .select("email, company_name")
        .eq("id", manifest.client_id)
        .maybeSingle();
      if (clientErr) throw clientErr;

      // Determine recipient
      if (client?.email) toList.push(client.email);
      console.log("Client email found:", client?.email);
      console.log("Recipient list:", toList);

      // Prefer manifest_number in subject if available
      if (manifest.manifest_number) {
        subject = body.subject ?? `Manifest ${manifest.manifest_number}`;
      }

      // Prefer saved pdf_path or latest acroform path
      if (manifest.acroform_pdf_path) pdfPath = manifest.acroform_pdf_path;
      else if (manifest.pdf_path) pdfPath = manifest.pdf_path;

      // Simple default HTML if none provided (link-only or attachment)
      if (!body.messageHtml) {
        const company = client?.company_name ?? "Customer";
        const number = manifest.manifest_number ?? manifest.id;
        const total = manifest.total ?? 0;
        const signed = manifest.signed_at ? new Date(manifest.signed_at).toLocaleString() : "N/A";
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manifest ${number}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
              .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
              .header p { margin: 5px 0 0 0; opacity: 0.9; }
              .content { padding: 30px; }
              .manifest-details { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
              .manifest-details h3 { margin-top: 0; color: #2563eb; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-label { font-weight: bold; color: #374151; }
              .detail-value { color: #6b7280; }
              .download-section { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
              .download-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${orgName}</h1>
                <p>Sustainable Tire Solutions</p>
              </div>
              
              <div class="content">
                <h2>Manifest ${number}</h2>
                <p>Hello ${company},</p>
                <p>Your tire recycling manifest has been processed and is ready for your records.</p>
                
                <div class="manifest-details">
                  <h3>Manifest Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Manifest Number:</span>
                    <span class="detail-value">${number}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Completion Date:</span>
                    <span class="detail-value">${signed}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Total Amount:</span>
                    <span class="detail-value">$${Number(total).toFixed(2)}</span>
                  </div>
                </div>
                
                ${body.attach === false ? 
                  `<div class="download-section">
                    <p><strong>Secure Download Available</strong></p>
                    <p>Your manifest PDF is available via secure link below (expires in 7 days).</p>
                  </div>` : 
                  `<div class="download-section">
                    <p><strong>PDF Attached</strong></p>
                    <p>Your manifest PDF is attached to this email for your convenience.</p>
                  </div>`
                }
                
                <p>Thank you for choosing ${orgName} for your sustainable tire disposal needs.</p>
                
                <div class="footer">
                  <p><strong>${orgName}</strong><br>
                  Committed to environmental responsibility and sustainable practices.</p>
                  <p style="font-size: 12px; margin-top: 15px;">This is an automated message. Please contact us if you have any questions.</p>
                  <p style="font-size: 11px; margin-top: 10px; color: #9ca3af;">Powered by <a href="https://treadset.co" style="color: #9ca3af;">TreadSet</a></p>
                </div>
              </div>
            </div>
          </body>
          </html>
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
    let signedUrl: string | undefined;
    if (pdfPath) {
      const asIs = pdfPath;
      const toggled = pdfPath.startsWith("manifests/") ? pdfPath.replace(/^manifests\//, "") : `manifests/${pdfPath}`;

      if (body.attach === false) {
        // link-only: create signed URL (try as-is first, then toggled)
        let urlErr;
        let signed;
        ({ data: signed, error: urlErr } = await supabase.storage
          .from("manifests")
          .createSignedUrl(asIs, 60 * 60 * 24 * 7));
        if (urlErr) {
          console.warn("Signed URL failed with asIs path, retrying with toggled:", urlErr?.message);
          ({ data: signed, error: urlErr } = await supabase.storage
            .from("manifests")
            .createSignedUrl(toggled, 60 * 60 * 24 * 7));
        }
        if (!urlErr) {
          signedUrl = signed?.signedUrl;
          if (!body.messageHtml && signedUrl) {
            html += `<p><a href="${signedUrl}">Download PDF (expires in 7 days)</a></p>`;
          }
        } else {
          console.error("Failed to create signed URL for both paths:", urlErr);
        }
      } else {
        // default: try to attach the file (try as-is, then toggled)
        console.log("Downloading PDF from storage (asIs):", asIs);
        let pdfDataResp = await supabase.storage.from("manifests").download(asIs);
        if (pdfDataResp.error) {
          console.warn("Download failed with asIs path, retrying with toggled:", pdfDataResp.error?.message);
          pdfDataResp = await supabase.storage.from("manifests").download(toggled);
        }

        if (pdfDataResp.error || !pdfDataResp.data) {
          console.error("Failed to download PDF for attachment, falling back to link:", pdfDataResp.error);
          // Fallback to signed URL
          const signedTry = await supabase.storage.from("manifests").createSignedUrl(asIs, 60 * 60 * 24 * 7);
          if (signedTry.error) {
            const signedTry2 = await supabase.storage.from("manifests").createSignedUrl(toggled, 60 * 60 * 24 * 7);
            if (!signedTry2.error) signedUrl = signedTry2.data?.signedUrl;
          } else signedUrl = signedTry.data?.signedUrl;
          if (!body.messageHtml && signedUrl) {
            html += `<p><a href="${signedUrl}">Download PDF (expires in 7 days)</a></p>`;
          }
        } else {
          const arrBuf = await pdfDataResp.data.arrayBuffer();
          const buf = new Uint8Array(arrBuf);
          const base64 = b64encode(buf.buffer);
          // Attempt to derive filename from path
          const parts = (pdfPath.includes('/') ? pdfPath : toggled).split("/");
          const filename = parts[parts.length - 1] || "manifest.pdf";
          attachment = {
            filename,
            content: base64,
            contentType: "application/pdf",
          } as any;
        }
      }
    }

    // Send email via Resend
    const emailPayload: any = {
      from: `${orgName} <noreply@bsgtires.com>`,
      to: toList,
      subject,
      html,
    };

    if (body.cc?.length) emailPayload.cc = body.cc;
    if (body.bcc?.length) emailPayload.bcc = body.bcc;
    if (attachment) emailPayload.attachments = [attachment];

    const sent = await resend.emails.send(emailPayload);
    console.log("Resend response:", sent);

    // Update manifest with email tracking info if manifest_id was provided
    if (body.manifest_id && sent.data?.id) {
      const emailUpdate: any = {
        email_sent_at: new Date().toISOString(),
        email_sent_to: toList,
        email_status: 'sent',
        email_resend_id: sent.data.id,
        email_error: null
      };
      
      const { error: updateError } = await supabase
        .from('manifests')
        .update(emailUpdate)
        .eq('id', body.manifest_id);
      
      if (updateError) {
        console.error('Failed to update manifest email tracking:', updateError);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, recipients: toList }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-manifest-email:", error);
    
    // Update manifest with error status if manifest_id was provided
    if (parsedBody?.manifest_id) {
      await supabase
        .from('manifests')
        .update({
          email_status: 'failed',
          email_error: error.message ?? "Unknown error",
        })
        .eq('id', parsedBody.manifest_id);
    }
    
    return new Response(
      JSON.stringify({ ok: false, error: error.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
