import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAIInsights, useGenerateInsights } from '@/hooks/useAIInsights';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AIInsightsCard = () => {
  const { data: insights, isLoading } = useAIInsights(1); // Only get latest
  const generateInsights = useGenerateInsights();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI Insights</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const latestInsight = insights?.[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Insights</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Daily
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateInsights.mutate()}
            disabled={generateInsights.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generateInsights.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Actionable recommendations based on your operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!latestInsight && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No insights available yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => generateInsights.mutate()}
              disabled={generateInsights.isPending}
            >
              Generate Insights
            </Button>
          </div>
        )}

        {latestInsight && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Latest
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(latestInsight.generated_at), { addSuffix: true })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">
                {latestInsight.summary_text}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
