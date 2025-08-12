import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  clientName: string;
  type?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  locationName?: string;
  address?: string;
  notes?: string;
  tags?: string;
  pricingTierName?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData, dryRun = true } = await req.json();
    
    console.log('Processing CSV import request:', { rowCount: csvData.length, dryRun });

    const errors: ValidationError[] = [];
    const processedData: { clients: any[], locations: any[] } = { clients: [], locations: [] };

    // Get existing pricing tiers for validation
    const { data: pricingTiers } = await supabase.from('pricing_tiers').select('id, name');
    const pricingTierMap = new Map(pricingTiers?.map(pt => [pt.name.toLowerCase(), pt.id]) || []);

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row: ImportRow = csvData[i];
      const rowNum = i + 2; // +2 because CSV has header and is 1-indexed

      // Validate required fields
      if (!row.clientName?.trim()) {
        errors.push({ row: rowNum, field: 'clientName', message: 'Client name is required' });
        continue;
      }

      // Validate email format if provided
      if (row.email && row.email.trim()) {
        const email = row.email.trim();
        console.log(`Row ${rowNum} email:`, JSON.stringify(email));
        
        // Skip validation if this looks like location/pickup data (contains state codes or pickup info)
        if (email.includes('MI ') || email.includes('Last pickup:') || email.includes('|')) {
          console.log(`Row ${rowNum}: Skipping email validation - appears to be location data`);
          row.email = null; // Clear invalid data
        } else if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: rowNum, field: 'email', message: `Invalid email format (found: "${email}")` });
        }
      }

      // Validate and normalize phone format if provided
      if (row.phone && row.phone.trim()) {
        console.log(`Row ${rowNum} phone before cleaning:`, JSON.stringify(row.phone));
        
        // Handle decimal format like "13136107242.0"
        let cleanPhone = String(row.phone).split('.')[0]; // Remove decimal part
        cleanPhone = cleanPhone.replace(/[\s\-\(\)\.]/g, ''); // Remove spaces, dashes, parentheses, dots
        
        console.log(`Row ${rowNum} phone after cleaning:`, cleanPhone);
        
        // Extract digits only
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        const digitCount = digitsOnly.length;
        
        if (digitCount < 10) {
          errors.push({ row: rowNum, field: 'phone', message: `Phone has ${digitCount} digits, need at least 10 digits (found: "${row.phone}")` });
        } else {
          // Normalize to E.164 format for US numbers
          if (digitCount === 10) {
            row.phone = '+1' + digitsOnly;
          } else if (digitCount === 11 && digitsOnly.startsWith('1')) {
            row.phone = '+' + digitsOnly;
          } else {
            // Take last 10 digits for any longer numbers
            row.phone = '+1' + digitsOnly.slice(-10);
          }
        }
      }

      // Validate type if provided - make it flexible
      if (row.type && row.type.trim()) {
        const type = row.type.trim().toLowerCase();
        console.log(`Row ${rowNum} type:`, JSON.stringify(row.type));
        
        // Skip validation if this looks like a city name (common Michigan cities)
        const cityNames = ['plymouth', 'mason', 'detroit', 'lansing', 'kalamazoo', 'grand rapids', 'flint', 'warren', 'sterling heights', 'ann arbor'];
        if (cityNames.includes(type) || /^[a-z\s]+$/.test(type)) {
          console.log(`Row ${rowNum}: Skipping type validation - appears to be city name, defaulting to commercial`);
          row.type = 'commercial'; // Default to commercial for city names
        } else {
          // Map common variations to valid types
          const typeMap: Record<string, string> = {
            'commercial': 'commercial',
            'residential': 'residential', 
            'industrial': 'industrial',
            'business': 'commercial',
            'corporate': 'commercial',
            'company': 'commercial',
            'home': 'residential',
            'house': 'residential',
            'factory': 'industrial',
            'warehouse': 'industrial',
            'manufacturing': 'industrial'
          };
          
          const validType = typeMap[type];
          if (validType) {
            row.type = validType;
          } else if (!['commercial', 'residential', 'industrial'].includes(type)) {
            console.log(`Row ${rowNum}: Unknown type "${row.type}", defaulting to commercial`);
            row.type = 'commercial'; // Default to commercial for unknown types
          }
        }
      }

      // Get pricing tier ID if provided
      let pricingTierId = null;
      if (row.pricingTierName) {
        pricingTierId = pricingTierMap.get(row.pricingTierName.toLowerCase());
        if (!pricingTierId) {
          errors.push({ row: rowNum, field: 'pricingTierName', message: `Pricing tier "${row.pricingTierName}" not found` });
        }
      }

      // Parse tags
      const tags = row.tags ? row.tags.split(';').map(tag => tag.trim()).filter(Boolean) : [];

      // Prepare client data
      const clientData = {
        company_name: row.clientName.trim(),
        type: row.type || null,
        contact_name: row.contactName?.trim() || null,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        notes: row.notes?.trim() || null,
        tags: tags.length > 0 ? tags : null,
        pricing_tier_id: pricingTierId,
        organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
      };

      processedData.clients.push({ ...clientData, _rowNum: rowNum });

      // Prepare location data if address is provided
      if (row.address?.trim()) {
        const locationData = {
          client_company_name: row.clientName.trim(), // We'll need to resolve this to client_id later
          name: row.locationName?.trim() || null,
          address: row.address.trim(),
          pricing_tier_id: pricingTierId,
          _rowNum: rowNum
        };

        processedData.locations.push(locationData);
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors, processedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If dry run, return preview data
    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          preview: {
            clients: processedData.clients.slice(0, 10), // Show first 10 for preview
            locations: processedData.locations.slice(0, 10),
            totalClients: processedData.clients.length,
            totalLocations: processedData.locations.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actually process the import
    let clientsProcessed = 0;
    let locationsProcessed = 0;
    const clientIdMap = new Map<string, string>();

    // Process clients (upsert by company_name)
    for (const clientData of processedData.clients) {
      const { _rowNum, ...cleanClientData } = clientData;
      
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('company_name', cleanClientData.company_name)
        .single();

      if (existingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(cleanClientData)
          .eq('id', existingClient.id);
        
        if (!error) {
          clientsProcessed++;
          clientIdMap.set(cleanClientData.company_name, existingClient.id);
        }
      } else {
        // Create new client
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert(cleanClientData)
          .select('id')
          .single();
        
        if (!error && newClient) {
          clientsProcessed++;
          clientIdMap.set(cleanClientData.company_name, newClient.id);
        }
      }
    }

    // Process locations
    for (const locationData of processedData.locations) {
      const { _rowNum, client_company_name, ...cleanLocationData } = locationData;
      const clientId = clientIdMap.get(client_company_name);
      
      if (clientId) {
        const locationWithClientId = {
          ...cleanLocationData,
          client_id: clientId,
          organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
        };

        // Check if location exists for this client
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('client_id', clientId)
          .eq('address', cleanLocationData.address)
          .single();

        if (existingLocation) {
          // Update existing location
          const { error } = await supabase
            .from('locations')
            .update(locationWithClientId)
            .eq('id', existingLocation.id);
          
          if (!error) locationsProcessed++;
        } else {
          // Create new location
          const { error } = await supabase
            .from('locations')
            .insert(locationWithClientId);
          
          if (!error) locationsProcessed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientsProcessed, 
        locationsProcessed 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CSV import error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});