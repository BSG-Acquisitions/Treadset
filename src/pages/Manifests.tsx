import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useManifests } from '@/hooks/useManifests';
import { useClient, useClients } from '@/hooks/useClients';
import { format, isToday, isThisMonth, subWeeks, subMonths, subDays, subYears, isAfter, isBefore, startOfMonth, endOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';
import { FileText, Clock, CheckCircle, CreditCard, ArrowLeft, MapPin, User, Calendar as CalendarIcon, Receipt, Search, X, ChevronDown, Download, FileSpreadsheet, Package } from 'lucide-react';
import { ManifestPDFControls } from '@/components/ManifestPDFControls';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type QuickFilter = 'all' | 'last30' | 'last90' | 'thisYear' | 'lastYear' | 'custom';

export default function Manifests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || 'all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  const { data: client } = useClient(clientId || '');
  const { data: clientsData } = useClients({ limit: 1000 });
  const clients = clientsData?.data || [];
  
  // Fetch manifests - if a client is selected, filter by that client
  const effectiveClientId = selectedClientId !== 'all' ? selectedClientId : undefined;
  const { data: manifests = [], isLoading } = useManifests(effectiveClientId);

  // Update URL when client changes
  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'all') {
      setSearchParams({ client: selectedClientId });
    } else {
      setSearchParams({});
    }
  }, [selectedClientId, setSearchParams]);

  // Handle quick filter changes
  useEffect(() => {
    const now = new Date();
    switch (quickFilter) {
      case 'last30':
        setFromDate(subDays(now, 30));
        setToDate(now);
        break;
      case 'last90':
        setFromDate(subDays(now, 90));
        setToDate(now);
        break;
      case 'thisYear':
        setFromDate(startOfYear(now));
        setToDate(now);
        break;
      case 'lastYear':
        const lastYear = subYears(now, 1);
        setFromDate(startOfYear(lastYear));
        setToDate(endOfMonth(subMonths(startOfYear(now), 1)));
        break;
      case 'all':
        setFromDate(undefined);
        setToDate(undefined);
        break;
      // 'custom' - don't change dates
    }
  }, [quickFilter]);

  // Get manifest date (signed_at or created_at)
  const getManifestDate = (manifest: any) => {
    return manifest.signed_at ? new Date(manifest.signed_at) : new Date(manifest.created_at);
  };

  // Filter manifests by search query and date range
  const filteredManifests = useMemo(() => {
    return manifests.filter(manifest => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          manifest.manifest_number?.toLowerCase().includes(query) ||
          manifest.client?.company_name?.toLowerCase().includes(query) ||
          manifest.location?.address?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (fromDate || toDate) {
        const manifestDate = getManifestDate(manifest);
        if (fromDate && manifestDate < fromDate) return false;
        if (toDate) {
          const endOfToDate = new Date(toDate);
          endOfToDate.setHours(23, 59, 59, 999);
          if (manifestDate > endOfToDate) return false;
        }
      }

      return true;
    });
  }, [manifests, searchQuery, fromDate, toDate]);

  // Group manifests by month when date range is active, otherwise by time period
  const groupedManifests = useMemo(() => {
    const hasDateFilter = fromDate || toDate;
    
    if (hasDateFilter) {
      // Group by month
      const byMonth: Record<string, any[]> = {};
      filteredManifests.forEach(m => {
        const date = getManifestDate(m);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMMM yyyy');
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = [];
        }
        byMonth[monthKey].push({ ...m, monthLabel });
      });
      
      // Sort by month descending
      return Object.entries(byMonth)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, items]) => ({
          key,
          label: items[0].monthLabel,
          manifests: items
        }));
    }

    // Default time period grouping
    const now = new Date();
    const startOfThisWeek = subWeeks(now, 0);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = subWeeks(startOfThisWeek, 1);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    return [
      { key: 'today', label: 'Today', manifests: filteredManifests.filter(m => isToday(getManifestDate(m))) },
      { key: 'thisWeek', label: 'This Week', manifests: filteredManifests.filter(m => {
        const date = getManifestDate(m);
        return !isToday(date) && date >= startOfThisWeek;
      }), groupByDay: true },
      { key: 'lastWeek', label: 'Last Week', manifests: filteredManifests.filter(m => {
        const date = getManifestDate(m);
        return date >= startOfLastWeek && date <= endOfLastWeek;
      }), groupByDay: true },
      { key: 'thisMonth', label: 'This Month', manifests: filteredManifests.filter(m => {
        const date = getManifestDate(m);
        return date < startOfLastWeek && isThisMonth(date);
      }) },
      { key: 'lastMonth', label: 'Last Month', manifests: filteredManifests.filter(m => {
        const date = getManifestDate(m);
        const monthAgo = subMonths(now, 1);
        const twoMonthsAgo = subMonths(now, 2);
        return isAfter(date, twoMonthsAgo) && isBefore(date, monthAgo);
      }) },
      { key: 'older', label: 'Older', manifests: filteredManifests.filter(m => {
        const date = getManifestDate(m);
        const twoMonthsAgo = subMonths(now, 2);
        return isBefore(date, twoMonthsAgo);
      }) },
    ].filter(g => g.manifests.length > 0);
  }, [filteredManifests, fromDate, toDate]);

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Manifest Number', 'Client', 'Location', 'Date', 'Status', 'PTE', 'OTR', 'Commercial', 'Total', 'Payment Method', 'Payment Status'];
    const rows = filteredManifests.map(m => [
      m.manifest_number || '',
      m.client?.company_name || '',
      m.location?.address || '',
      format(getManifestDate(m), 'yyyy-MM-dd'),
      m.status,
      (m.pte_off_rim || 0) + (m.pte_on_rim || 0),
      m.otr_count || 0,
      (m.commercial_17_5_19_5_off || 0) + (m.commercial_17_5_19_5_on || 0) + (m.commercial_22_5_off || 0) + (m.commercial_22_5_on || 0) + (m.tractor_count || 0),
      m.total?.toFixed(2) || '0.00',
      m.payment_method || '',
      m.payment_status || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const clientName = selectedClientId !== 'all' ? clients.find(c => c.id === selectedClientId)?.company_name?.replace(/[^a-z0-9]/gi, '_') || 'Client' : 'AllClients';
    const dateRange = fromDate && toDate ? `_${format(fromDate, 'yyyyMMdd')}-${format(toDate, 'yyyyMMdd')}` : '';
    a.download = `Manifests_${clientName}${dateRange}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredManifests.length} manifests to CSV`);
  };

  // Export all PDFs as ZIP
  const handleExportZIP = async () => {
    const completedManifests = filteredManifests.filter(m => m.status === 'COMPLETED' && (m.pdf_path || m.acroform_pdf_path));
    
    if (completedManifests.length === 0) {
      toast.error('No completed manifests with PDFs to export');
      return;
    }

    setIsExporting(true);
    toast.info(`Preparing ${completedManifests.length} PDFs for download...`);

    try {
      // For now, download each PDF individually since we don't have server-side ZIP
      // In production, this could be an edge function that creates a ZIP
      for (const manifest of completedManifests.slice(0, 10)) { // Limit to 10 for safety
        const pdfPath = manifest.acroform_pdf_path || manifest.pdf_path;
        if (!pdfPath) continue;

        const { data, error } = await supabase.storage
          .from('manifests')
          .createSignedUrl(pdfPath, 60);

        if (data?.signedUrl) {
          const response = await fetch(data.signedUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const clientName = manifest.client?.company_name?.replace(/[^a-z0-9]/gi, '_') || 'Unknown';
          const date = format(getManifestDate(manifest), 'yyyy-MM-dd');
          a.download = `${manifest.manifest_number}_${clientName}_${date}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (completedManifests.length > 10) {
        toast.warning(`Downloaded first 10 PDFs. For bulk exports over 10 files, please contact support.`);
      } else {
        toast.success(`Downloaded ${Math.min(completedManifests.length, 10)} PDFs`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export some PDFs');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (client) {
      document.title = `${client.company_name} Manifests – TreadSet`;
    } else {
      document.title = 'All Manifests – TreadSet';
    }
  }, [client]);

  const renderManifestCard = (manifest: any) => (
    <div
      key={manifest.id}
      className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4"
    >
      <div className="flex items-start gap-4 flex-1">
        {getStatusIcon(manifest.status)}
        <div className="flex flex-col space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">
              {manifest.manifest_number}
            </span>
            <Badge variant={getStatusColor(manifest.status)}>
              {manifest.status.replace(/_/g, ' ')}
            </Badge>
            {manifest.payment_method === 'INVOICE' && manifest.payment_status === 'PENDING' && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white">
                <Receipt className="h-3 w-3 mr-1" />
                Requires Invoice
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {selectedClientId === 'all' && manifest.client && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{manifest.client.company_name}</span>
              </div>
            )}
            
            {manifest.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{manifest.location.address}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                {format(getManifestDate(manifest), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(manifest.pte_off_rim + manifest.pte_on_rim) > 0 && (
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                {manifest.pte_off_rim + manifest.pte_on_rim} PTE
              </span>
            )}
            {manifest.otr_count > 0 && (
              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-2 py-0.5 rounded text-xs font-medium">
                {manifest.otr_count} OTR
              </span>
            )}
            {(manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count) > 0 && (
              <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded text-xs font-medium">
                {manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count} COM
              </span>
            )}
          </div>

          {manifest.status === 'COMPLETED' && (manifest.pdf_path || manifest.acroform_pdf_path) && (
            <div className="mt-2">
              <ManifestPDFControls
                manifestId={manifest.id}
                acroformPdfPath={manifest.acroform_pdf_path}
                initialPdfPath={manifest.initial_pdf_path}
                clientEmails={manifest.client?.email ? [manifest.client.email] : []}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 md:flex-col md:items-end">
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">
            ${manifest.total?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-muted-foreground">
            {manifest.payment_method === 'INVOICE' && manifest.payment_status === 'PENDING' ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5" />
                To Be Invoiced
              </span>
            ) : manifest.payment_status === 'SUCCEEDED' ? (
              'Paid'
            ) : manifest.payment_status === 'PENDING' ? (
              'Pending'
            ) : (
              manifest.payment_method
            )}
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant="outline"
          asChild
        >
          <Link to={`/driver/manifest/${manifest.id}`}>
            View Details
          </Link>
        </Button>
      </div>
    </div>
  );

  const groupByDayOfWeek = (manifests: any[]) => {
    const days: Record<string, any[]> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    manifests.forEach(m => {
      const date = getManifestDate(m);
      const dayName = format(date, 'EEEE');
      if (!days[dayName]) {
        days[dayName] = [];
      }
      days[dayName].push(m);
    });

    return Object.entries(days).sort((a, b) => {
      const aIndex = dayNames.indexOf(a[0]);
      const bIndex = dayNames.indexOf(b[0]);
      return bIndex - aIndex;
    });
  };

  const renderTimeSection = (group: { key: string; label: string; manifests: any[]; groupByDay?: boolean }) => {
    if (group.manifests.length === 0) return null;
    const isOpen = openSections[group.key] ?? false;

    return (
      <Collapsible 
        key={group.key}
        open={isOpen} 
        onOpenChange={() => toggleSection(group.key)}
        className="border border-border rounded-lg"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            <h3 className="text-lg font-semibold text-foreground">{group.label}</h3>
            <Badge variant="secondary">{group.manifests.length}</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          {group.groupByDay ? (
            <div className="space-y-4 pt-3">
              {groupByDayOfWeek(group.manifests).map(([dayName, dayManifests]) => (
                <div key={dayName} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground px-2">{dayName}</h4>
                  <div className="space-y-3">
                    {dayManifests.map(renderManifestCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {group.manifests.map(renderManifestCard)}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'AWAITING_SIGNATURE':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'AWAITING_PAYMENT':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return 'secondary';
      case 'AWAITING_SIGNATURE':
      case 'AWAITING_PAYMENT':
      case 'COMPLETED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const selectedClientName = selectedClientId !== 'all' 
    ? clients.find(c => c.id === selectedClientId)?.company_name 
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8 text-muted-foreground">Loading manifests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {clientId && client && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/clients/${clientId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {client.company_name}
              </Link>
            </Button>
          )}
          
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manifest Compliance Recall
            </h1>
            <p className="text-muted-foreground mt-1">
              Search and export manifests for audits and compliance requests
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Client and Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Client</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search manifest #, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* From Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => {
                        setFromDate(date);
                        setQuickFilter('custom');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => {
                        setToDate(date);
                        setQuickFilter('custom');
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Dates */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">&nbsp;</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setFromDate(undefined);
                    setToDate(undefined);
                    setQuickFilter('all');
                  }}
                  disabled={!fromDate && !toDate}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Dates
                </Button>
              </div>
            </div>

            {/* Row 3: Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground self-center mr-2">Quick:</span>
              {[
                { key: 'all', label: 'All Time' },
                { key: 'last30', label: 'Last 30 Days' },
                { key: 'last90', label: 'Last 90 Days' },
                { key: 'thisYear', label: 'This Year' },
                { key: 'lastYear', label: 'Last Year' },
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={quickFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setQuickFilter(filter.key as QuickFilter)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results Summary & Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 rounded-lg p-4 border">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {filteredManifests.length} {filteredManifests.length === 1 ? 'manifest' : 'manifests'} found
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedClientName && `for ${selectedClientName}`}
              {fromDate && toDate && ` from ${format(fromDate, 'MMM d, yyyy')} to ${format(toDate, 'MMM d, yyyy')}`}
              {fromDate && !toDate && ` from ${format(fromDate, 'MMM d, yyyy')}`}
              {!fromDate && toDate && ` until ${format(toDate, 'MMM d, yyyy')}`}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredManifests.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportZIP}
              disabled={filteredManifests.length === 0 || isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Download PDFs'}
            </Button>
          </div>
        </div>

        {/* Manifests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Manifests
            </CardTitle>
            <CardDescription>
              {fromDate || toDate ? 'Grouped by month' : 'Organized by time period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredManifests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No manifests found
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || fromDate || toDate
                    ? 'Try adjusting your filters'
                    : 'Manifests will appear here once created'
                  }
                </p>
                {(searchQuery || fromDate || toDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setFromDate(undefined);
                      setToDate(undefined);
                      setQuickFilter('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {groupedManifests.map(renderTimeSection)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
