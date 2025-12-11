import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Info, Calendar, ArrowRight } from "lucide-react";
import { ActionableInsight } from "@/hooks/useClientAnalyticsDeep";
import { useNavigate } from "react-router-dom";

interface ClientInsightCardsProps {
  insights: ActionableInsight[];
}

function InsightCard({ insight }: { insight: ActionableInsight }) {
  const navigate = useNavigate();
  
  const getIcon = () => {
    switch (insight.type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'alert': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBgClass = () => {
    switch (insight.type) {
      case 'warning': return 'border-l-4 border-l-yellow-500 bg-yellow-500/5';
      case 'success': return 'border-l-4 border-l-green-500 bg-green-500/5';
      case 'alert': return 'border-l-4 border-l-red-500 bg-red-500/5';
      case 'info': return 'border-l-4 border-l-blue-500 bg-blue-500/5';
    }
  };

  const handleAction = () => {
    if (insight.clientId) {
      navigate(`/clients/${insight.clientId}`);
    }
  };

  return (
    <Card className={getBgClass()}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{insight.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
            {insight.action && (
              <Button 
                variant="link" 
                size="sm" 
                className="px-0 mt-2 h-auto"
                onClick={handleAction}
              >
                {insight.action} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientInsightCards({ insights }: ClientInsightCardsProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No insights available for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {insights.map((insight, index) => (
        <InsightCard key={index} insight={insight} />
      ))}
    </div>
  );
}
