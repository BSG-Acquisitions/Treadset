import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function arrayToCsv(data: any[], headers: string[]): string {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, startDate, endDate } = await req.json();
    
    console.log('Processing CSV export:', { type, startDate, endDate });

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'clients': {
        const { data: clients, error } = await supabase
          .from('clients')
          .select(`
            company_name,
            type,
            contact_name,
            email,
            phone,
            notes,
            tags,
            lifetime_revenue,
            open_balance,
            last_pickup_at,
            created_at,
            pricing_tier:pricing_tiers(name)
          `)
          .order('company_name');

        if (error) throw error;

        const headers = [
          'company_name',
          'type',
          'contact_name', 
          'email',
          'phone',
          'notes',
          'tags',
          'pricing_tier',
          'lifetime_revenue',
          'open_balance',
          'last_pickup_at',
          'created_at'
        ];

        const csvData = clients?.map(client => ({
          company_name: client.company_name,
          type: client.type,
          contact_name: client.contact_name,
          email: client.email,
          phone: client.phone,
          notes: client.notes,
          tags: client.tags ? client.tags.join(';') : '',
          pricing_tier: client.pricing_tier?.name || '',
          lifetime_revenue: client.lifetime_revenue || 0,
          open_balance: client.open_balance || 0,
          last_pickup_at: client.last_pickup_at || '',
          created_at: client.created_at
        })) || [];

        csvContent = arrayToCsv(csvData, headers);
        filename = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      case 'pickups': {
        if (!startDate || !endDate) {
          throw new Error('Start date and end date are required for pickups export');
        }

        const { data: pickups, error } = await supabase
          .from('pickups')
          .select(`
            pickup_date,
            status,
            pte_count,
            otr_count,
            tractor_count,
            computed_revenue,
            notes,
            client:clients(company_name),
            location:locations(name, address),
            assignments(
              vehicle:vehicles(name),
              estimated_arrival,
              actual_arrival,
              status
            )
          `)
          .gte('pickup_date', startDate)
          .lte('pickup_date', endDate)
          .order('pickup_date');

        if (error) throw error;

        const headers = [
          'pickup_date',
          'client_name',
          'location_name',
          'location_address',
          'pte_count',
          'otr_count',
          'tractor_count',
          'computed_revenue',
          'pickup_status',
          'vehicle_name',
          'estimated_arrival',
          'actual_arrival',
          'assignment_status',
          'notes'
        ];

        const csvData = pickups?.map(pickup => {
          const assignment = pickup.assignments?.[0]; // Get first assignment
          return {
            pickup_date: pickup.pickup_date,
            client_name: pickup.client?.company_name || '',
            location_name: pickup.location?.name || '',
            location_address: pickup.location?.address || '',
            pte_count: pickup.pte_count || 0,
            otr_count: pickup.otr_count || 0,
            tractor_count: pickup.tractor_count || 0,
            computed_revenue: pickup.computed_revenue || 0,
            pickup_status: pickup.status || '',
            vehicle_name: assignment?.vehicle?.name || '',
            estimated_arrival: assignment?.estimated_arrival || '',
            actual_arrival: assignment?.actual_arrival || '',
            assignment_status: assignment?.status || '',
            notes: pickup.notes || ''
          };
        }) || [];

        csvContent = arrayToCsv(csvData, headers);
        filename = `pickups_export_${startDate}_to_${endDate}.csv`;
        break;
      }

      case 'invoices': {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select(`
            invoice_number,
            issued_date,
            due_date,
            status,
            subtotal,
            tax_amount,
            total_amount,
            notes,
            client:clients(company_name),
            payments(amount, payment_date, payment_method),
            invoice_items(
              description,
              quantity,
              unit_price,
              total_price,
              pickup:pickups(pickup_date)
            )
          `)
          .order('issued_date', { ascending: false });

        if (error) throw error;

        const headers = [
          'invoice_number',
          'client_name',
          'issued_date',
          'due_date',
          'status',
          'subtotal',
          'tax_amount',
          'total_amount',
          'total_paid',
          'balance_due',
          'item_count',
          'notes'
        ];

        const csvData = invoices?.map(invoice => {
          const totalPaid = invoice.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          const balanceDue = (invoice.total_amount || 0) - totalPaid;
          
          return {
            invoice_number: invoice.invoice_number,
            client_name: invoice.client?.company_name || '',
            issued_date: invoice.issued_date || '',
            due_date: invoice.due_date || '',
            status: invoice.status || '',
            subtotal: invoice.subtotal || 0,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount || 0,
            total_paid: totalPaid,
            balance_due: balanceDue,
            item_count: invoice.invoice_items?.length || 0,
            notes: invoice.notes || ''
          };
        }) || [];

        csvContent = arrayToCsv(csvData, headers);
        filename = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      }

      default:
        throw new Error(`Unknown export type: ${type}`);
    }

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});