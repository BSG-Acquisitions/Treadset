import { useState } from 'react';
import { MessageSquare, X, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const formatResultData = (result: any) => {
  if (!result?.data) return null;

  switch (result.type) {
    case 'top_clients_revenue':
      return (
        <div className="space-y-2">
          {result.data.map((client: any, i: number) => (
            <div key={client.id} className="flex justify-between text-sm">
              <span>{i + 1}. {client.company_name}</span>
              <Badge variant="outline">${client.lifetime_revenue?.toFixed(2) || 0}</Badge>
            </div>
          ))}
        </div>
      );

    case 'pte_processed':
      return (
        <div className="text-sm">
          <div className="flex justify-between mb-2">
            <span>Total PTEs:</span>
            <Badge variant="default">{result.data.total}</Badge>
          </div>
          <div className="text-muted-foreground">Period: {result.data.period}</div>
        </div>
      );

    case 'driver_performance':
      return (
        <div className="space-y-2">
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">All drivers meet the threshold</p>
          ) : (
            result.data.map((driver: any) => (
              <div key={driver.driver_id} className="flex justify-between text-sm">
                <span>{driver.driver_name}</span>
                <Badge variant="destructive">{driver.on_time_rate.toFixed(1)}%</Badge>
              </div>
            ))
          )}
        </div>
      );

    case 'recent_pickups':
      return (
        <div className="space-y-2">
          {result.data.slice(0, 5).map((pickup: any) => (
            <div key={pickup.id} className="text-sm border-b pb-2">
              <div className="font-medium">{pickup.clients?.company_name}</div>
              <div className="flex justify-between text-muted-foreground">
                <span>{pickup.pickup_date}</span>
                <span>{pickup.pte_count} PTEs • ${pickup.computed_revenue?.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {result.data.length > 5 && (
            <p className="text-xs text-muted-foreground">+ {result.data.length - 5} more...</p>
          )}
        </div>
      );

    case 'revenue_forecast':
      return result.data ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>30-day forecast:</span>
            <Badge variant="default">${result.data.forecast_30_day?.toFixed(2)}</Badge>
          </div>
          <div className="flex justify-between">
            <span>60-day forecast:</span>
            <Badge variant="secondary">${result.data.forecast_60_day?.toFixed(2)}</Badge>
          </div>
          <div className="flex justify-between">
            <span>90-day forecast:</span>
            <Badge variant="outline">${result.data.forecast_90_day?.toFixed(2)}</Badge>
          </div>
          <div className="text-muted-foreground text-xs pt-2">
            Confidence: {result.data.confidence_score}%
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No forecast data available</p>
      );

    case 'client_risk':
      return (
        <div className="space-y-2">
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients at this risk level</p>
          ) : (
            result.data.slice(0, 5).map((client: any) => (
              <div key={client.client_id} className="text-sm border-b pb-2">
                <div className="font-medium">{client.clients?.company_name}</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Risk Score: {client.risk_score}</span>
                  <Badge variant="destructive">{client.risk_level}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      );

    default:
      return <pre className="text-xs">{JSON.stringify(result.data, null, 2)}</pre>;
  }
};

export const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendQuery, clearHistory } = useAIAssistant();
  const { hasAnyRole } = useAuth();

  // Only show for Admin, Ops Manager, and Sales Manager
  if (!hasAnyRole(['admin', 'ops_manager', 'sales'])) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    await sendQuery(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Ask BSG AI</span>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  title="Clear history"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </SheetTitle>
            <SheetDescription>
              Ask questions about operations, clients, revenue, and performance metrics
            </SheetDescription>
          </SheetHeader>

          {/* Chat History */}
          <ScrollArea className="flex-1 pr-4 mb-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Try asking questions like:
                    </p>
                    <ul className="text-sm space-y-2 list-disc list-inside text-muted-foreground">
                      <li>Show me top clients by revenue this month</li>
                      <li>How many PTEs did we process last week?</li>
                      <li>List drivers with on-time rate below 90%</li>
                      <li>What's the revenue forecast for next quarter?</li>
                      <li>Show clients at high risk of churn</li>
                    </ul>
                  </CardContent>
                </Card>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <Card
                      className={`max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <CardContent className="p-3">
                        <p className="text-sm mb-1">{message.content}</p>
                        {message.result && (
                          <div className="mt-3 pt-3 border-t">
                            {formatResultData(message.result)}
                          </div>
                        )}
                        <p className="text-xs opacity-70 mt-2">
                          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="bg-muted">
                    <CardContent className="p-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
