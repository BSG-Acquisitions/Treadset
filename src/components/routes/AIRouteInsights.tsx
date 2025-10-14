import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, MapPin, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RouteImprovement {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  estimated_savings: string;
}

interface RouteSuggestion {
  vehicle: string;
  suggested_sequence: string[];
  reasoning: string;
}

interface AIAnalysis {
  efficiency_score: number;
  improvements: RouteImprovement[];
  route_suggestions: RouteSuggestion[];
  insights: string;
}

interface AIRouteInsightsProps {
  date: string;
}

export function AIRouteInsights({ date }: AIRouteInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const { toast } = useToast();

  const analyzeRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-route-optimizer', {
        body: { date }
      });

      if (error) throw error;

      setAnalysis(data.ai_analysis);
      
      toast({
        title: "AI Analysis Complete",
        description: "Route optimization suggestions generated successfully",
      });
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze routes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Route Optimization
              </CardTitle>
              <CardDescription>
                Get intelligent suggestions to improve your routes
              </CardDescription>
            </div>
            <Button 
              onClick={analyzeRoutes} 
              disabled={loading}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Analyzing..." : "Analyze Routes"}
            </Button>
          </div>
        </CardHeader>

        {analysis && (
          <CardContent className="space-y-6">
            {/* Efficiency Score */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{analysis.efficiency_score}%</div>
                <div className="text-sm text-muted-foreground">Route Efficiency Score</div>
              </div>
            </div>

            {/* Improvements */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Top Improvements
                </h3>
                {analysis.improvements.map((improvement, idx) => (
                  <Card key={idx} className="border-l-4" style={{ borderLeftColor: `hsl(var(--${improvement.impact === 'high' ? 'green' : improvement.impact === 'medium' ? 'yellow' : 'blue'}-500))` }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{improvement.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getImpactColor(improvement.impact)}>
                            {improvement.impact}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {improvement.estimated_savings}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{improvement.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Route Suggestions */}
            {analysis.route_suggestions && analysis.route_suggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Suggested Route Sequences
                </h3>
                {analysis.route_suggestions.map((suggestion, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="text-base">{suggestion.vehicle}</CardTitle>
                      <CardDescription>{suggestion.reasoning}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Optimal Stop Order:</div>
                        <ol className="text-sm space-y-1 pl-4">
                          {suggestion.suggested_sequence.map((stop, stopIdx) => (
                            <li key={stopIdx} className="list-decimal">
                              {stop}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Overall Insights */}
            {analysis.insights && (
              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Overall Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{analysis.insights}</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
