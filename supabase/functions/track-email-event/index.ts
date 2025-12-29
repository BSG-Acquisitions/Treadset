import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const inviteId = url.searchParams.get("invite");
    const eventType = url.searchParams.get("type") || "open"; // 'open' or 'click'
    const redirect = url.searchParams.get("redirect");

    if (!inviteId) {
      console.log("[TRACK-EMAIL] Missing invite ID");
      if (redirect) {
        return Response.redirect(redirect, 302);
      }
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/png", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request metadata
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

    console.log(`[TRACK-EMAIL] Recording ${eventType} event for invite ${inviteId}`);

    // Record the event in email_events table
    const { error: eventError } = await supabase
      .from("email_events")
      .insert({
        invite_id: inviteId,
        event_type: eventType,
        user_agent: userAgent,
        ip_address: ipAddress,
        metadata: {
          redirect: redirect || null,
          timestamp: new Date().toISOString(),
        },
      });

    if (eventError) {
      console.error("[TRACK-EMAIL] Failed to insert event:", eventError);
    }

    // Update the client_invites table with first open/click timestamp
    if (eventType === "open") {
      const { error: updateError } = await supabase
        .from("client_invites")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", inviteId)
        .is("opened_at", null); // Only update if not already set

      if (updateError) {
        console.error("[TRACK-EMAIL] Failed to update opened_at:", updateError);
      }
    } else if (eventType === "click") {
      // Also mark as opened if clicking (they had to open to click)
      const { error: updateError } = await supabase
        .from("client_invites")
        .update({ 
          clicked_at: new Date().toISOString(),
          opened_at: new Date().toISOString() // Ensure opened is set too
        })
        .eq("id", inviteId)
        .is("clicked_at", null);

      if (updateError) {
        console.error("[TRACK-EMAIL] Failed to update clicked_at:", updateError);
      }
    }

    // If this is a click event with redirect, redirect the user
    if (eventType === "click" && redirect) {
      console.log(`[TRACK-EMAIL] Redirecting to: ${redirect}`);
      return Response.redirect(redirect, 302);
    }

    // For open events (or clicks without redirect), return tracking pixel
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/png", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[TRACK-EMAIL] Error:", error);
    
    // Even on error, return the pixel or redirect so we don't break the email
    const url = new URL(req.url);
    const redirect = url.searchParams.get("redirect");
    
    if (redirect) {
      return Response.redirect(redirect, 302);
    }
    
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/png", ...corsHeaders },
    });
  }
};

serve(handler);
