import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useManifests } from '@/hooks/useManifests';
import { useClient } from '@/hooks/useClients';
import { ManifestAlertsList } from '@/components/ManifestAlertsList';
import { format, isToday, isThisMonth, subWeeks, subMonths, isAfter, isBefore } from 'date-fns';
import { FileText, Clock, CheckCircle, CreditCard, ArrowLeft, MapPin, User, Calendar, Receipt, Search, X, ChevronDown } from 'lucide-react';
import { ManifestPDFControls } from '@/components/ManifestPDFControls';

export default function Manifests() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState({
    today: false,
    thisWeek: false,
    lastWeek: false,
    thisMonth: false,
    lastMonth: false,
    older: false,
  });
  
  const { data: client } = useClient(clientId || '');
  const { data: manifests = [], isLoading } = useManifests(clientId || undefined);

  // Filter manifests by search query
  const filteredManifests = manifests.filter(manifest => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      manifest.manifest_number?.toLowerCase().includes(query) ||
      manifest.client?.company_name?.toLowerCase().includes(query) ||
      manifest.location?.address?.toLowerCase().includes(query)
    );
  });

  // Group manifests by time period using signed_at (completion date) with fallback to created_at
  const getManifestDate = (manifest: any) => {
    // Use signed_at (final completion) if available, otherwise fall back to created_at
    return manifest.signed_at ? new Date(manifest.signed_at) : new Date(manifest.created_at);
  };

  const now = new Date();
  const startOfThisWeek = subWeeks(now, 0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay()); // Set to Sunday
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  const startOfLastWeek = subWeeks(startOfThisWeek, 1);
  const endOfLastWeek = new Date(startOfThisWeek);
  endOfLastWeek.setMilliseconds(-1);

  const groupedManifests = {
    today: filteredManifests.filter(m => isToday(getManifestDate(m))),
    thisWeek: filteredManifests.filter(m => {
      const date = getManifestDate(m);
      return !isToday(date) && date >= startOfThisWeek;
    }),
    lastWeek: filteredManifests.filter(m => {
      const date = getManifestDate(m);
      return date >= startOfLastWeek && date <= endOfLastWeek;
    }),
    thisMonth: filteredManifests.filter(m => {
      const date = getManifestDate(m);
      return date < startOfLastWeek && isThisMonth(date);
    }),
    lastMonth: filteredManifests.filter(m => {
      const date = getManifestDate(m);
      const monthAgo = subMonths(now, 1);
      const twoMonthsAgo = subMonths(now, 2);
      return isAfter(date, twoMonthsAgo) && isBefore(date, monthAgo);
    }),
    older: filteredManifests.filter(m => {
      const date = getManifestDate(m);
      const twoMonthsAgo = subMonths(now, 2);
      return isBefore(date, twoMonthsAgo);
    }),
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
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
      {/* Left side - Manifest info */}
      <div className="flex items-start gap-4 flex-1">
        {getStatusIcon(manifest.status)}
        <div className="flex flex-col space-y-2 flex-1">
          {/* Manifest number and status */}
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
          
          {/* Client and Location info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {!clientId && manifest.client && (
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
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(manifest.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          {/* Tire counts */}
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

          {/* PDF Controls for completed manifests */}
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
      
      {/* Right side - Payment and action */}
      <div className="flex items-center gap-4 md:flex-col md:items-end">
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">
            ${manifest.total.toFixed(2)}
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

  // Group manifests by day of week
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

    // Sort by day order within the week
    return Object.entries(days).sort((a, b) => {
      const aIndex = dayNames.indexOf(a[0]);
      const bIndex = dayNames.indexOf(b[0]);
      return bIndex - aIndex; // Reverse order (most recent first)
    });
  };

  const renderTimeSection = (
    title: string,
    manifests: any[],
    sectionKey: keyof typeof openSections,
    groupByDay: boolean = false
  ) => {
    if (manifests.length === 0) return null;

    return (
      <Collapsible 
        open={openSections[sectionKey]} 
        onOpenChange={() => toggleSection(sectionKey)}
        className="border border-border rounded-lg"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSections[sectionKey] ? 'rotate-180' : ''}`} />
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary">{manifests.length}</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          {groupByDay ? (
            <div className="space-y-4 pt-3">
              {groupByDayOfWeek(manifests).map(([dayName, dayManifests]) => (
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
              {manifests.map(renderManifestCard)}
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return 'secondary';
      case 'AWAITING_SIGNATURE':
        return 'default';
      case 'AWAITING_PAYMENT':
        return 'default';
      case 'COMPLETED':
        return 'default';
      default:
        return 'secondary';
    }
  };

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
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {client ? `${client.company_name} Manifests` : 'All Manifests'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredManifests.length} {filteredManifests.length === 1 ? 'manifest' : 'manifests'} found
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client, manifest #, or location..."
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

        <ManifestAlertsList />

        {/* Manifests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Manifests
            </CardTitle>
            <CardDescription>
              Organized by time period for easy navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredManifests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {searchQuery ? 'No manifests found' : 'No manifests found'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? `No manifests match "${searchQuery}". Try a different search term.`
                    : 'Manifests will appear here once created'
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {renderTimeSection('Today', groupedManifests.today, 'today')}
                {renderTimeSection('This Week', groupedManifests.thisWeek, 'thisWeek', true)}
                {renderTimeSection('Last Week', groupedManifests.lastWeek, 'lastWeek', true)}
                {renderTimeSection('This Month', groupedManifests.thisMonth, 'thisMonth')}
                {renderTimeSection('Last Month', groupedManifests.lastMonth, 'lastMonth')}
                {renderTimeSection('Older', groupedManifests.older, 'older')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
