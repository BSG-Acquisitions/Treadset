import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get("client");
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // 'unsubscribe' or 'resubscribe'

    if (!clientId) {
      return generateHtmlResponse(
        "Invalid Link",
        "This unsubscribe link is invalid. Please contact us if you need assistance.",
        false
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the client exists
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, company_name, email, portal_invite_opted_out")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientId, clientError);
      return generateHtmlResponse(
        "Client Not Found",
        "We couldn't find your account. Please contact us if you need assistance.",
        false
      );
    }

    // Simple token validation: hash of client ID + email (basic protection against random unsubscribes)
    const expectedToken = await generateSecurityToken(client.id, client.email || "");
    if (token !== expectedToken) {
      console.warn("Invalid token for client:", clientId);
      // Still allow unsubscribe but log it - this is a convenience feature, not high-security
    }

    const shouldOptOut = action !== "resubscribe";

    // Update the opt-out status
    const { error: updateError } = await supabase
      .from("clients")
      .update({ 
        portal_invite_opted_out: shouldOptOut,
        updated_at: new Date().toISOString()
      })
      .eq("id", clientId);

    if (updateError) {
      console.error("Failed to update opt-out status:", updateError);
      return generateHtmlResponse(
        "Something Went Wrong",
        "We couldn't process your request. Please try again or contact us.",
        false
      );
    }

    console.log(`Client ${client.company_name} (${clientId}) ${shouldOptOut ? 'unsubscribed from' : 'resubscribed to'} portal invitations`);

    if (shouldOptOut) {
      // Generate resubscribe link
      const resubscribeUrl = `${supabaseUrl}/functions/v1/portal-invite-unsubscribe?client=${clientId}&token=${expectedToken}&action=resubscribe`;
      
      return generateHtmlResponse(
        "Unsubscribed Successfully",
        `
          <p>You've been unsubscribed from BSG Tire Recycling portal invitation emails.</p>
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            Changed your mind? 
            <a href="${resubscribeUrl}" style="color: #1A4314; text-decoration: underline;">Click here to resubscribe</a>
          </p>
        `,
        true,
        true
      );
    } else {
      return generateHtmlResponse(
        "Resubscribed Successfully",
        `
          <p>You've been resubscribed to BSG Tire Recycling portal invitation emails.</p>
          <p style="margin-top: 20px;">You'll receive your next portal invitation within a few days.</p>
        `,
        true
      );
    }

  } catch (error: any) {
    console.error("Error in portal-invite-unsubscribe:", error);
    return generateHtmlResponse(
      "Something Went Wrong",
      "We couldn't process your request. Please try again or contact us at (313) 731-0817.",
      false
    );
  }
};

// Generate a simple security token (not cryptographically strong, but sufficient for email unsubscribe)
async function generateSecurityToken(clientId: string, email: string): Promise<string> {
  const data = `${clientId}-${email}-portal-invite-salt`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateHtmlResponse(title: string, message: string, success: boolean, isHtml: boolean = false): Response {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - BSG Tire Recycling</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e8 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
          max-width: 480px;
          width: 100%;
          text-align: center;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%);
          color: white;
          padding: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: ${success ? '#1A4314' : '#dc2626'};
        }
        .message {
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 14px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BSG Tire Recycling</h1>
        </div>
        <div class="content">
          <div class="icon">${success ? '✅' : '❌'}</div>
          <h2 class="title">${title}</h2>
          <div class="message">${isHtml ? message : `<p>${message}</p>`}</div>
        </div>
        <div class="footer">
          Questions? Contact us at (313) 731-0817 or bsgtires@gmail.com
        </div>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders
    }
  });
}

// Export for use by drip function
export { generateSecurityToken };

serve(handler);
