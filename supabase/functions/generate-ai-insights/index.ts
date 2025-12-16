import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgsError) throw orgsError;

    const insights = [];

    for (const org of orgs || []) {
      console.log(`Generating insights for org: ${org.id}`);

      // Delete ALL old insights for this organization (keep only fresh data)
      await supabase
        .from('ai_insights')
        .delete()
        .eq('organization_id', org.id);

      // Fetch comprehensive data for actionable insights
      const [
        patternsData,
        inactiveClientsData,
        recentPickupsData,
        recentDropoffsData,
        upcomingPickupsData,
        riskData,
      ] = await Promise.all([
        // Client pickup patterns with client names
        supabase
          .from('client_pickup_patterns')
          .select('*, clients(company_name)')
          .eq('organization_id', org.id)
          .order('confidence_score', { ascending: false }),
        
        // Clients inactive for 30+ days
        supabase
          .from('clients')
          .select('id, company_name, last_pickup_at')
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .lt('last_pickup_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('last_pickup_at', { ascending: true })
          .limit(10),
        
        // Recent completed pickups (last 7 days)
        supabase
          .from('pickups')
          .select('id, final_revenue, computed_revenue, clients(company_name)')
          .eq('organization_id', org.id)
          .eq('status', 'completed')
          .gte('pickup_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        
        // Recent dropoffs (last 7 days)
        supabase
          .from('dropoffs')
          .select('id, computed_revenue')
          .eq('organization_id', org.id)
          .gte('dropoff_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        
        // Upcoming scheduled pickups (next 7 days)
        supabase
          .from('pickups')
          .select('id, pickup_date, clients(company_name)')
          .eq('organization_id', org.id)
          .eq('status', 'scheduled')
          .gte('pickup_date', new Date().toISOString().split('T')[0])
          .lte('pickup_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('pickup_date', { ascending: true }),
        
        // High-risk clients
        supabase
          .from('client_risk_scores')
          .select('*, clients(company_name)')
          .eq('organization_id', org.id)
          .eq('risk_level', 'high')
          .limit(5),
      ]);

      // Process patterns data
      const patterns = patternsData.data || [];
      const weeklyClients = patterns.filter((p: any) => p.frequency === 'weekly');
      const biweeklyClients = patterns.filter((p: any) => p.frequency === 'biweekly');
      const monthlyClients = patterns.filter((p: any) => p.frequency === 'monthly');

      // Calculate recent activity stats
      const recentPickups = recentPickupsData.data || [];
      const recentDropoffs = recentDropoffsData.data || [];
      const pickupRevenue = recentPickups.reduce((sum: number, p: any) => 
        sum + (p.final_revenue || p.computed_revenue || 0), 0);
      const dropoffRevenue = recentDropoffs.reduce((sum: number, d: any) => 
        sum + (d.computed_revenue || 0), 0);

      // Inactive clients
      const inactiveClients = inactiveClientsData.data || [];
      const highRiskClients = riskData.data || [];
      const upcomingPickups = upcomingPickupsData.data || [];

      // Build context for AI
      const context = {
        patterns: {
          total: patterns.length,
          weekly: weeklyClients.map((p: any) => p.clients?.company_name).filter(Boolean).slice(0, 5),
          biweekly: biweeklyClients.map((p: any) => p.clients?.company_name).filter(Boolean).slice(0, 5),
          monthly: monthlyClients.map((p: any) => p.clients?.company_name).filter(Boolean).slice(0, 5),
        },
        recentActivity: {
          pickupCount: recentPickups.length,
          dropoffCount: recentDropoffs.length,
          totalRevenue: pickupRevenue + dropoffRevenue,
          pickupRevenue,
          dropoffRevenue,
        },
        inactive: inactiveClients.map((c: any) => ({
          name: c.company_name,
          daysSince: Math.floor((Date.now() - new Date(c.last_pickup_at).getTime()) / (1000 * 60 * 60 * 24))
        })).slice(0, 5),
        highRisk: highRiskClients.map((r: any) => r.clients?.company_name).filter(Boolean),
        upcoming: upcomingPickups.slice(0, 5).map((p: any) => ({
          name: p.clients?.company_name,
          date: p.pickup_date
        })),
      };

      // Generate summary using Lovable AI
      let summaryText = '';
      
      if (lovableApiKey) {
        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You are an operations analyst providing ACTIONABLE daily insights for a tire recycling business.

CRITICAL RULES:
- Be SPECIFIC with client names - use actual names from the data
- Focus on ACTION items: who to call, who to schedule, who needs attention
- DO NOT mention revenue forecasts (there's a separate tile for that)
- Keep insights brief but actionable (3-5 bullet points max)
- Use • for bullet points
- If data is empty for a category, skip it entirely

Format example:
• ACTION: Call [Client Name] - overdue for weekly pickup (last service 10 days ago)
• SCHEDULED: 3 pickups this week including ABC Company on Monday
• ATTENTION: [Client Name] hasn't been serviced in 45 days - consider reaching out
• PATTERNS: 8 weekly clients, 9 biweekly clients actively tracked`,
                },
                {
                  role: 'user',
                  content: `Generate actionable insights from this data:

CLIENT PATTERNS:
- Total clients with patterns: ${context.patterns.total}
- Weekly clients: ${context.patterns.weekly.join(', ') || 'None'}
- Biweekly clients: ${context.patterns.biweekly.join(', ') || 'None'}
- Monthly clients: ${context.patterns.monthly.join(', ') || 'None'}

LAST 7 DAYS ACTIVITY:
- Pickups completed: ${context.recentActivity.pickupCount}
- Drop-offs received: ${context.recentActivity.dropoffCount}

CLIENTS NEEDING ATTENTION:
${context.inactive.length > 0 
  ? context.inactive.map(c => `- ${c.name}: ${c.daysSince} days since last pickup`).join('\n')
  : '- All clients are active'}

HIGH-RISK CLIENTS: ${context.highRisk.length > 0 ? context.highRisk.join(', ') : 'None'}

UPCOMING THIS WEEK:
${context.upcoming.length > 0
  ? context.upcoming.map(p => `- ${p.name} on ${p.date}`).join('\n')
  : '- No pickups scheduled'}

Provide 3-5 actionable bullet points.`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            summaryText = aiData.choices?.[0]?.message?.content || generateFallbackSummary(context);
          } else {
            console.error('AI API error:', await aiResponse.text());
            summaryText = generateFallbackSummary(context);
          }
        } catch (error) {
          console.error('AI generation error:', error);
          summaryText = generateFallbackSummary(context);
        }
      } else {
        summaryText = generateFallbackSummary(context);
      }

      // Store insight
      const { data: insight, error: insertError } = await supabase
        .from('ai_insights')
        .insert({
          organization_id: org.id,
          summary_text: summaryText,
          insights_data: context,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        insights.push(insight);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        count: insights.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateFallbackSummary(context: any): string {
  const bullets = [];

  // Upcoming pickups
  if (context.upcoming.length > 0) {
    const names = context.upcoming.slice(0, 3).map((p: any) => p.name).join(', ');
    bullets.push(`• SCHEDULED: ${context.upcoming.length} pickup${context.upcoming.length > 1 ? 's' : ''} this week including ${names}`);
  }

  // Inactive clients needing attention
  if (context.inactive.length > 0) {
    const topInactive = context.inactive[0];
    bullets.push(`• ATTENTION: ${topInactive.name} hasn't been serviced in ${topInactive.daysSince} days`);
  }

  // High-risk clients
  if (context.highRisk.length > 0) {
    bullets.push(`• RISK: ${context.highRisk.length} high-risk client${context.highRisk.length > 1 ? 's' : ''} need attention: ${context.highRisk.slice(0, 2).join(', ')}`);
  }

  // Pattern summary
  if (context.patterns.total > 0) {
    const weekly = context.patterns.weekly.length;
    const biweekly = context.patterns.biweekly.length;
    bullets.push(`• PATTERNS: Tracking ${weekly} weekly and ${biweekly} biweekly clients`);
  }

  // Recent activity
  if (context.recentActivity.pickupCount > 0 || context.recentActivity.dropoffCount > 0) {
    bullets.push(`• ACTIVITY: ${context.recentActivity.pickupCount} pickups and ${context.recentActivity.dropoffCount} drop-offs in the last 7 days`);
  }

  return bullets.length > 0 
    ? bullets.join('\n') 
    : '• All operations running smoothly - no urgent items';
}
