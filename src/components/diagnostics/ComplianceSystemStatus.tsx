import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useMichiganReport } from "@/hooks/useMichiganReporting";
import { supabase } from "@/integrations/supabase/client";

export const ComplianceSystemStatus = () => {
  const [conversionTest, setConversionTest] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', result?: any }>({ status: 'idle' });
  const currentYear = new Date().getFullYear();
  const { data: reportData, isLoading, error } = useMichiganReport(currentYear);

  const testConversionKernel = async () => {
    setConversionTest({ status: 'testing' });
    try {
      const { data, error } = await supabase.functions.invoke('conversion-kernel', {
        body: {
          value: 89,
          from_unit: 'pte',
          to_unit: 'tons',
          context: { rounding: 'report' }
        }
      });

      if (error) throw error;
      
      setConversionTest({ 
        status: data.converted_value === 1 ? 'success' : 'error',
        result: data 
      });
    } catch (err) {
      setConversionTest({ status: 'error', result: err });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (condition: boolean, label: string) => (
    <div className="flex items-center gap-2">
      {getStatusIcon(condition ? 'success' : 'error')}
      <span className="text-sm">{label}</span>
      <Badge variant={condition ? 'default' : 'destructive'}>
        {condition ? 'OK' : 'FAIL'}
      </Badge>
    </div>
  );

  // System health checks
  const hasData = !isLoading && !error && reportData && reportData.totalPTE > 0;
  const hasCountyBreakdown = reportData && Object.keys(reportData.byCounty).length > 0;
  const hasMonthlyData = reportData && reportData.monthlyBreakdown.some(m => m.pte > 0);
  const conversionWorks = conversionTest.status === 'success';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Compliance Reporting System Status
          <Badge variant={hasData ? 'default' : 'secondary'}>
            {hasData ? 'OPERATIONAL' : 'NEEDS ATTENTION'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time health check of compliance reporting components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Data Pipeline</h4>
            {getStatusBadge(hasData, 'Pickup Data Available')}
            {getStatusBadge(hasCountyBreakdown, 'County Breakdown')}
            {getStatusBadge(hasMonthlyData, 'Monthly Aggregation')}
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Conversions</h4>
            <div className="flex items-center gap-2">
              {getStatusIcon(conversionWorks ? 'success' : conversionTest.status === 'error' ? 'error' : 'warning')}
              <span className="text-sm">89 PTE = 1 Ton Rule</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testConversionKernel}
                disabled={conversionTest.status === 'testing'}
                className="ml-auto"
              >
                {conversionTest.status === 'testing' ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            {conversionTest.result && (
              <div className="text-xs bg-muted p-2 rounded">
                <pre>{JSON.stringify(conversionTest.result, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {reportData && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Current Report Summary ({currentYear})</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-600">Total PTEs:</span>
                <div className="font-bold">{reportData.totalPTE.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-green-600">Total Tons:</span>
                <div className="font-bold">{reportData.totalTons.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-green-600">Counties:</span>
                <div className="font-bold">{Object.keys(reportData.byCounty).length}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};