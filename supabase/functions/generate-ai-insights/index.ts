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
      .select('id');

    if (orgsError) throw orgsError;

    const insights = [];

    for (const org of orgs || []) {
      console.log(`Generating insights for org: ${org.id}`);

      // Fetch data from all intelligence modules
      const [revenueData, riskData, reliabilityData, assignmentData] = await Promise.all([
        supabase
          .from('revenue_forecasts')
          .select('*')
          .eq('organization_id', org.id)
          .order('forecast_month', { ascending: false })
          .limit(3),
        
        supabase
          .from('client_risk_scores')
          .select('*')
          .eq('organization_id', org.id)
          .order('risk_score', { ascending: false })
          .limit(5),
        
        supabase
          .from('hauler_reliability')
          .select('*')
          .eq('organization_id', org.id)
          .order('reliability_score', { ascending: true })
          .limit(5),
        
        supabase
          .from('assignments')
          .select('*')
          .eq('organization_id', org.id)
          .eq('status', 'completed')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Build context for AI
      const context = {
        revenue: revenueData.data || [],
        risks: riskData.data || [],
        reliability: reliabilityData.data || [],
        recentCompletions: (assignmentData.data || []).length,
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
                  content: `You are an operations analyst creating daily insights. Be concise, specific, and data-driven.

CRITICAL RULES - YOU MUST FOLLOW THESE:
- ONLY report insights based on the data explicitly provided in the user message
- Do NOT fabricate or infer statistics that are not in the provided data
- Do NOT make claims about "best days", day-of-week patterns, or time-of-day trends (this data is NOT provided)
- Do NOT invent specific dollar amounts, percentages, or metrics not explicitly in the data
- Focus ONLY on: revenue forecast comparisons, high-risk client counts, low-reliability hauler counts, and assignment completion counts
- If data is empty or insufficient for a particular insight, skip that insight entirely rather than guessing
- Keep summaries under 300 words total with 3-5 bullet points`,
                },
                {
                  role: 'user',
                  content: `Generate a daily operational summary based on this data:

Revenue Forecasts (last 3 months): ${JSON.stringify(context.revenue, null, 2)}
High-Risk Clients: ${JSON.stringify(context.risks, null, 2)}
Low-Reliability Haulers: ${JSON.stringify(context.reliability, null, 2)}
Completed Assignments (last 7 days): ${context.recentCompletions}

Format as bullet points with key insights.`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            summaryText = aiData.choices?.[0]?.message?.content || 'No insights generated.';
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

  // Revenue insight
  if (context.revenue.length >= 2) {
    const current = context.revenue[0]?.forecasted_revenue || 0;
    const previous = context.revenue[1]?.forecasted_revenue || 0;
    const change = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 0;
    bullets.push(`• Revenue forecast ${change > 0 ? 'up' : 'down'} ${Math.abs(Number(change))}% vs last month`);
  }

  // Risk insight
  const highRisk = context.risks.filter((r: any) => r.risk_level === 'high').length;
  if (highRisk > 0) {
    bullets.push(`• ${highRisk} client${highRisk > 1 ? 's' : ''} flagged as high risk`);
  }

  // Reliability insight
  const lowReliability = context.reliability.filter((h: any) => h.reliability_score < 80).length;
  if (lowReliability > 0) {
    bullets.push(`• ${lowReliability} hauler${lowReliability > 1 ? 's' : ''} below 80% reliability score`);
  }

  // Activity insight
  if (context.recentCompletions > 0) {
    bullets.push(`• ${context.recentCompletions} assignments completed in the last 7 days`);
  }

  return bullets.length > 0 
    ? bullets.join('\n') 
    : '• No significant operational changes detected';
}