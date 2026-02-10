import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  CalendarDays, 
  TrendingUp, 
  Scale, 
  FileText, 
  Download, 
  Lock, 
  AlertTriangle,
  Home,
  Recycle,
  Building2,
  MapPin,
  Truck
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMichiganReport, useExportMichiganReport, useSubmitMichiganReport } from "@/hooks/useMichiganReporting";
import { useOutboundSummary } from "@/hooks/useShipments";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/formatters";
import { ComplianceSystemStatus } from "@/components/diagnostics/ComplianceSystemStatus";
import { OutboundTab } from "@/components/reports/OutboundTab";

const StateComplianceReports = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: reportData, isLoading, error } = useMichiganReport(selectedYear);
  const { data: outboundSummary } = useOutboundSummary(selectedYear);
  const exportReport = useExportMichiganReport();
  const submitReport = useSubmitMichiganReport();

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Calculate completeness percentage
  const calculateCompleteness = (): number => {
    if (!reportData) return 0;
    
    let score = 0;
    const maxScore = 100;
    
    // Data completeness checks
    if (reportData.totalPTE > 0) score += 30;
    if (Object.keys(reportData.byCounty).length > 0) score += 20;
    if (reportData.monthlyBreakdown.some(m => m.pte > 0)) score += 20;
    if (reportData.collectionSites.length > 0) score += 15;
    // Processing events would add 15 points when implemented
    
    return Math.min(score, maxScore);
  };

  const getRequiredFields = (): string[] => {
    if (!reportData) return [];
    
    const missing = [];
    if (reportData.totalPTE === 0) missing.push("Tire collection data");
    if (Object.keys(reportData.byCounty).length === 0) missing.push("County information");
    if (reportData.collectionSites.length === 0) missing.push("Collection site details");
    if (reportData.portableShredding.length === 0) missing.push("Processing operations");
    
    return missing;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading report: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const requiredFields = getRequiredFields();

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto font-normal hover:text-foreground">
          <Link to="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <span>/</span>
        <span className="text-foreground">Compliance Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">State Compliance Reports</h1>
          <p className="text-muted-foreground">
            Annual scrap tire reporting for state regulatory compliance
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PTEs In</CardTitle>
            <Recycle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reportData?.totalPTE || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Passenger Tire Equivalents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tons In</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(reportData?.totalTons || 0, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Conversion: 89 PTE = 1 ton
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tons Out</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(outboundSummary?.totalTons || 0, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Outbound shipments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completeness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completeness}%</div>
            <Progress value={completeness} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={completeness === 100 ? "default" : "secondary"}>
                {completeness === 100 ? "Ready" : "In Progress"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <ComplianceSystemStatus />

      {/* Required Fields Alert */}
      {requiredFields.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Missing Required Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-2">
              The following data is required for submission:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {requiredFields.map(field => (
                <li key={field} className="text-sm text-orange-700">{field}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inbound">Inbound</TabsTrigger>
          <TabsTrigger value="outbound">Outbound</TabsTrigger>
          <TabsTrigger value="destinations">Counties</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="totals">State Totals</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>Tire collection by month for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData?.monthlyBreakdown.map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{month.monthName}</p>
                        <p className="text-sm text-muted-foreground">{month.pickups} pickups</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatNumber(month.pte)} PTE</p>
                        <p className="text-sm text-muted-foreground">{formatNumber(month.tons, { maximumFractionDigits: 2 })} tons</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Material Form</CardTitle>
                <CardDescription>Tire types collected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Passenger Tires (Off-Rim)</span>
                    <Badge variant="outline">{formatNumber(reportData?.byMaterialForm.whole_off_rim || 0)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Semi/Truck Tires</span>
                    <Badge variant="outline">{formatNumber(reportData?.byMaterialForm.semi || 0)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>OTR/Heavy Equipment</span>
                    <Badge variant="outline">{formatNumber(reportData?.byMaterialForm.otr || 0)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inbound">
          <Card>
            <CardHeader>
              <CardTitle>Inbound Summary</CardTitle>
              <CardDescription>Tire collection data for {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-lg bg-blue-50">
                  <div className="text-3xl font-bold text-blue-600">{formatNumber(reportData?.totalPTE || 0)}</div>
                  <p className="text-blue-800 font-medium">Total PTEs Collected</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-green-50">
                  <div className="text-3xl font-bold text-green-600">{formatNumber(reportData?.totalTons || 0, { maximumFractionDigits: 2 })}</div>
                  <p className="text-green-800 font-medium">Total Tons (89 PTE/ton)</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-purple-50">
                  <div className="text-3xl font-bold text-purple-600">{formatNumber(reportData?.totalCubicYards || 0, { maximumFractionDigits: 1 })}</div>
                  <p className="text-purple-800 font-medium">Cubic Yards Equivalent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound">
          <OutboundTab year={selectedYear} />
        </TabsContent>

        <TabsContent value="destinations">
          <Card>
            <CardHeader>
              <CardTitle>County Distribution</CardTitle>
              <CardDescription>Tire collection by county</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(reportData?.byCounty || {}).map(([county, pte]) => (
                  <div key={county} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{county}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{formatNumber(pte)} PTE</div>
                      <div>{formatNumber(pte / 89, { maximumFractionDigits: 2 })} tons</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing Operations</CardTitle>
              <CardDescription>Portable shredding and on-site processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No processing operations recorded for {selectedYear}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Processing events will be tracked when available
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card>
            <CardHeader>
              <CardTitle>Collection Sites</CardTitle>
              <CardDescription>Active collection sites and storage information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.collectionSites.map((site, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{site.name}</h4>
                        <p className="text-sm text-muted-foreground">{site.county} County</p>
                      </div>
                      <Badge variant={site.onSiteProcessing ? "default" : "secondary"}>
                        {site.onSiteProcessing ? "Processing" : "Collection"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Annual PTE:</span>
                        <span className="font-medium ml-2">{formatNumber(site.annualPTE)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Annual Tons:</span>
                        <span className="font-medium ml-2">{formatNumber(site.annualTons, { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals">
          <Card>
            <CardHeader>
              <CardTitle>State Compliance Totals</CardTitle>
              <CardDescription>Final totals for regulatory submission</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Summary Totals</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded bg-blue-50">
                      <span>Total PTEs Collected</span>
                      <span className="font-bold text-blue-600">{formatNumber(reportData?.totalPTE || 0)}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded bg-green-50">
                      <span>Total Tons (89 PTE/ton)</span>
                      <span className="font-bold text-green-600">{formatNumber(reportData?.totalTons || 0, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-3 rounded bg-purple-50">
                      <span>Cubic Yards Equivalent</span>
                      <span className="font-bold text-purple-600">{formatNumber(reportData?.totalCubicYards || 0, { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Conversion Rules</h3>
                  <div className="text-sm space-y-2 p-4 rounded bg-muted/50">
                    <div>• 1 Passenger Tire = 1 PTE</div>
                    <div>• 1 Semi Truck Tire = 5 PTE</div>
                    <div>• 1 OTR Tire = 15 PTE</div>
                    <div className="font-semibold text-primary">• 89 PTE = 1 Ton</div>
                    <div>• 10 PTE = 1 Cubic Yard</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export & Submit</CardTitle>
              <CardDescription>Generate reports and submit for compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => exportReport.mutate({ year: selectedYear, format: 'csv' })}
                    disabled={exportReport.isPending}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                  
                  <Button
                    onClick={() => exportReport.mutate({ year: selectedYear, format: 'pdf' })}
                    disabled={exportReport.isPending}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Submit for Compliance</h3>
                      <p className="text-sm text-muted-foreground">
                        Lock and submit this report for regulatory compliance
                      </p>
                    </div>
                    <Button
                      onClick={() => submitReport.mutate({ year: selectedYear })}
                      disabled={completeness < 100 || submitReport.isPending}
                      className="flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Submit & Lock
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StateComplianceReports;