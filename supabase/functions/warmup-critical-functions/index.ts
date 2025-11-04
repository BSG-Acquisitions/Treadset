/**
 * Warm-up Critical Functions
 * Reduces cold-start delays by pre-warming frequently used functions
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRITICAL_FUNCTIONS = [
  'generate-acroform-manifest',
  'calculate-revenue-forecast',
  'generate-ai-insights',
  'system-health-check',
  'ai-assistant',
];

const PROJECT_URL = 'https://wvjehbozyxhmgdljwsiz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2amVoYm96eXhobWdkbGp3c2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMDczNjIsImV4cCI6MjA3MDU4MzM2Mn0.LrH1N6KoB5QcfpmkSxqy-yGMqXmChLVJsv1YMmq5AVY';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting function warm-up...');
    const results = [];

    for (const functionName of CRITICAL_FUNCTIONS) {
      const startTime = performance.now();
      
      try {
        // Send warm-up ping to function
        const response = await fetch(
          `${PROJECT_URL}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'x-warmup': 'true',
            },
            body: JSON.stringify({ warmup: true }),
          }
        );

        const duration = Math.round(performance.now() - startTime);
        
        results.push({
          function: functionName,
          status: response.status,
          duration: `${duration}ms`,
          warmed: response.status < 500,
        });

        console.log(`Warmed ${functionName}: ${duration}ms (${response.status})`);
      } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        results.push({
          function: functionName,
          status: 'error',
          duration: `${duration}ms`,
          warmed: false,
          error: error.message,
        });
        console.error(`Failed to warm ${functionName}:`, error);
      }
    }

    const successCount = results.filter(r => r.warmed).length;

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        warmed: successCount,
        total: CRITICAL_FUNCTIONS.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Warm-up failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
