import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Package, TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useInventoryReports, useInventoryProductsList, getDatePresetRange, DatePreset } from '@/hooks/useInventoryReports';
import { PRODUCT_CATEGORIES } from '@/hooks/useInventoryProducts';
import { useCSVExport } from '@/hooks/useCSVExport';

const DATE_PRESETS = [
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
] as const;

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
];

export default function InventoryReports() {
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  
  const csvExport = useCSVExport();
  const { data: products } = useInventoryProductsList();

  // Compute date range based on preset or custom
  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getDatePresetRange(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  const { 
    summary, 
    byProduct, 
    monthlyTrend, 
    transactions, 
    isLoading 
  } = useInventoryReports({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    productId: selectedProductId !== 'all' ? selectedProductId : undefined,
    transactionType: 'outbound',
  });

  const getCategoryLabel = (category: string) => {
    return PRODUCT_CATEGORIES.find(c => c.value === category)?.label ?? category;
  };

  const handleExportCSV = () => {
    csvExport.mutate({
      type: 'inventory-transactions',
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  // Prepare chart data
  const pieChartData = byProduct.slice(0, 6).map((item, index) => ({
    name: item.productName,
    value: item.totalQuantity,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const barChartData = byProduct.slice(0, 8).map(item => ({
    name: item.productName.length > 15 ? item.productName.slice(0, 15) + '...' : item.productName,
    quantity: item.totalQuantity,
    unit: item.unitOfMeasure,
  }));

  const lineChartData = monthlyTrend.map(item => ({
    name: item.monthLabel,
    quantity: item.totalQuantity,
    transactions: item.transactionCount,
  }));

  const chartConfig = {
    quantity: { label: 'Quantity', color: 'hsl(var(--primary))' },
    transactions: { label: 'Transactions', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/inventory" className="flex items-center gap-1 hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Inventory
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Sales Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Inventory Sales Reports"
        description="Track your outbound inventory, sales trends, and export data for analysis."
      />

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportCSV}
                disabled={csvExport.isPending || transactions.length === 0}
              >
                <Download className="h-4 w-4" />
                {csvExport.isPending ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Outbound
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalOutbound.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">units sold</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.transactionCount}</div>
              <p className="text-xs text-muted-foreground">sales recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Products Sold
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueProducts}</div>
              <p className="text-xs text-muted-foreground">different products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>
              <p className="text-xs text-muted-foreground">unique customers</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts & Data Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="by-product" className="gap-2">
            <Package className="h-4 w-4" />
            By Product
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <FileText className="h-4 w-4" />
            All Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales Trend</CardTitle>
                <CardDescription>Monthly outbound quantities</CardDescription>
              </CardHeader>
              <CardContent>
                {lineChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="quantity"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data for the selected period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Distribution</CardTitle>
                <CardDescription>Top products by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data for the selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-product" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales by Product</CardTitle>
              <CardDescription>Quantity sold per product</CardDescription>
            </CardHeader>
            <CardContent>
              {barChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <BarChart data={barChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              {byProduct.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity Sold</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getCategoryLabel(item.category)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalQuantity.toLocaleString()} {item.unitOfMeasure}
                        </TableCell>
                        <TableCell className="text-right">{item.transactionCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No data for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Transaction History</CardTitle>
                <CardDescription>
                  {transactions.length} transactions from {format(new Date(dateRange.startDate), 'MMM d, yyyy')} to {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExportCSV}
                disabled={csvExport.isPending || transactions.length === 0}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{format(new Date(t.transaction_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-medium">{t.product?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-right">
                            {t.quantity} {t.unit_of_measure}
                          </TableCell>
                          <TableCell>{t.customer_name || '—'}</TableCell>
                          <TableCell>
                            {t.reference_type ? (
                              <Badge variant="outline" className="capitalize">
                                {t.reference_type}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {t.notes || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found for the selected period.</p>
                  <p className="text-sm mt-1">Try adjusting the date range or filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
