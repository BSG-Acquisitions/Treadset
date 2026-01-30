import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface PasswordResetEmailRequest {
  email: string;
  resetUrl: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetUrl, companyName = "TreadSet" }: PasswordResetEmailRequest = await req.json();

    console.log("Sending password reset email to:", email);
    console.log("Reset URL:", resetUrl);

    const emailResponse = await resend.emails.send({
      from: `TreadSet <noreply@treadset.com>`,
      to: [email],
      subject: `Reset Your TreadSet Password`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
            .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .button:hover { transform: translateY(-1px); }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
            .warning { background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TreadSet</h1>
              <p>Tire Management Solutions</p>
            </div>
            
            <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your TreadSet account associated with <strong>${email}</strong>.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in 1 hour for security purposes.
            </div>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <div class="footer">
              <p><strong>TreadSet Team</strong><br>
              Streamlining tire recycling operations.</p>
              <p style="font-size: 12px; margin-top: 15px;">This is an automated message. Please do not reply to this email.</p>
            </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
