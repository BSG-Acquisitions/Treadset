import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExportRequest {
  type: 'inventory-transactions';
  startDate?: string;
  endDate?: string;
  productId?: string;
  transactionType?: 'inbound' | 'outbound' | 'all';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user to verify authentication and get org
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: userData, error: orgError } = await supabase
      .from("users")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (orgError || !userData?.current_organization_id) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = userData.current_organization_id;
    const body: ExportRequest = await req.json();

    if (body.type !== 'inventory-transactions') {
      return new Response(JSON.stringify({ error: "Invalid export type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query for inventory transactions
    let query = supabase
      .from("inventory_transactions")
      .select(`
        *,
        product:inventory_products(name, category, unit_of_measure)
      `)
      .eq("organization_id", orgId)
      .order("transaction_date", { ascending: false });

    // Apply filters
    if (body.transactionType && body.transactionType !== 'all') {
      query = query.eq("transaction_type", body.transactionType);
    } else {
      // Default to outbound for sales export
      query = query.eq("transaction_type", "outbound");
    }

    if (body.startDate) {
      query = query.gte("transaction_date", body.startDate);
    }
    if (body.endDate) {
      query = query.lte("transaction_date", body.endDate);
    }
    if (body.productId) {
      query = query.eq("product_id", body.productId);
    }

    const { data: transactions, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate CSV content
    const headers = [
      "Date",
      "Product",
      "Category",
      "Transaction Type",
      "Quantity",
      "Unit",
      "Customer Name",
      "Reference Type",
      "Notes",
    ];

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = transactions.map((t: any) => [
      escapeCSV(t.transaction_date),
      escapeCSV(t.product?.name),
      escapeCSV(t.product?.category),
      escapeCSV(t.transaction_type),
      t.quantity?.toString() || "0",
      escapeCSV(t.unit_of_measure),
      escapeCSV(t.customer_name),
      escapeCSV(t.reference_type),
      escapeCSV(t.notes),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.join(",")),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inventory_transactions_export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
