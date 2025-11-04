import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAIInsights, useGenerateInsights } from '@/hooks/useAIInsights';
import { Brain, ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export const AIInsightsCard = () => {
  const { data: insights, isLoading } = useAIInsights(7);
  const generateInsights = useGenerateInsights();
  const [openInsights, setOpenInsights] = useState<Record<string, boolean>>({});

  const toggleInsight = (id: string) => {
    setOpenInsights(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestInsight = insights?.[0];
  const olderInsights = insights?.slice(1) || [];

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
          Automated operational summaries from all intelligence modules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
              Generate First Insight
            </Button>
          </div>
        )}

        {latestInsight && (
          <div className="space-y-3">
            {/* Latest Insight - Always Expanded */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Latest
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(latestInsight.generated_at), { addSuffix: true })}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">
                {latestInsight.summary_text}
              </div>
            </div>

            {/* Older Insights - Collapsible */}
            {olderInsights.map(insight => (
              <Collapsible
                key={insight.id}
                open={openInsights[insight.id]}
                onOpenChange={() => toggleInsight(insight.id)}
              >
                <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${openInsights[insight.id] ? 'rotate-180' : ''}`} />
                        <span className="text-sm font-medium">
                          {new Date(insight.generated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 pt-3 border-t prose prose-sm max-w-none text-foreground whitespace-pre-line">
                      {insight.summary_text}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};