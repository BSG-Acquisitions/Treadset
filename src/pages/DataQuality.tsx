import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataQualityFlags, DataQualityFlag } from '@/hooks/useDataQualityFlags';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Filter,
  ExternalLink,
  Users,
  MapPin,
  FileText,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getRecordTypeIcon = (type: string) => {
  switch (type) {
    case 'client':
      return <Users className="h-4 w-4" />;
    case 'pickup':
      return <MapPin className="h-4 w-4" />;
    case 'manifest':
      return <FileText className="h-4 w-4" />;
    case 'location':
      return <Navigation className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getRecordLink = (flag: DataQualityFlag) => {
  switch (flag.record_type) {
    case 'client':
      return `/clients/${flag.record_id}`;
    case 'manifest':
      return `/manifests`;
    case 'pickup':
    case 'location':
      return `/routes/today`;
    default:
      return '/';
  }
};

const DataQuality = () => {
  const navigate = useNavigate();
  const { 
    flags, 
    resolvedFlags, 
    isLoading, 
    stats, 
    markAsReviewed, 
    isMarkingReviewed,
    triggerScan,
    isScanning 
  } = useDataQualityFlags();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; flag?: DataQualityFlag }>({ open: false });
  const [reviewNotes, setReviewNotes] = useState('');

  const filteredFlags = flags.filter(flag => {
    if (severityFilter !== 'all' && flag.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && flag.record_type !== typeFilter) return false;
    if (searchQuery && !flag.issue.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleReview = () => {
    if (!reviewDialog.flag) return;
    markAsReviewed({ flagId: reviewDialog.flag.id, notes: reviewNotes });
    setReviewDialog({ open: false });
    setReviewNotes('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and review data quality issues across your organization
          </p>
        </div>
        <Button
          onClick={() => triggerScan()}
          disabled={isScanning}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          Run Scan Now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Unresolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Medium Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              Low Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Quality Issues</CardTitle>
              <CardDescription>Review and resolve flagged data issues</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="pickup">Pickups</SelectItem>
                <SelectItem value="manifest">Manifests</SelectItem>
                <SelectItem value="location">Locations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="unresolved">
            <TabsList>
              <TabsTrigger value="unresolved">
                Unresolved ({filteredFlags.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedFlags.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unresolved" className="space-y-4 mt-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredFlags.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">No issues found - excellent data quality!</p>
                </div>
              ) : (
                filteredFlags.map((flag) => (
                  <Card key={flag.id} className={`border-l-4 ${
                    flag.severity === 'high' ? 'border-l-red-500' :
                    flag.severity === 'medium' ? 'border-l-yellow-500' :
                    'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRecordTypeIcon(flag.record_type)}
                            <Badge variant={getSeverityColor(flag.severity)}>
                              {flag.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {flag.record_type}
                            </Badge>
                          </div>

                          <p className="text-sm font-medium mb-1">{flag.issue}</p>
                          
                          <p className="text-xs text-muted-foreground">
                            Detected: {format(new Date(flag.detected_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(getRecordLink(flag))}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setReviewDialog({ open: true, flag })}
                            disabled={isMarkingReviewed}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Reviewed
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4 mt-4">
              {resolvedFlags.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No resolved issues yet</p>
                </div>
              ) : (
                resolvedFlags.map((flag) => (
                  <Card key={flag.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRecordTypeIcon(flag.record_type)}
                            <Badge variant="outline">{flag.record_type}</Badge>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>

                          <p className="text-sm font-medium mb-1 line-through">{flag.issue}</p>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Detected: {format(new Date(flag.detected_at), 'MMM d, yyyy')}</p>
                            <p>Resolved: {format(new Date(flag.resolved_at!), 'MMM d, yyyy')}</p>
                            {flag.notes && <p className="italic">Note: {flag.notes}</p>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Issue as Reviewed</DialogTitle>
            <DialogDescription>
              Add optional notes about how this issue was resolved
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{reviewDialog.flag?.issue}</p>
            </div>

            <Textarea
              placeholder="Resolution notes (optional)..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={isMarkingReviewed}>
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataQuality;
