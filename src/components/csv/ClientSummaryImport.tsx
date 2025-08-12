import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ClientSummaryImportProps {
  onSuccess?: () => void;
}

export function ClientSummaryImport({ onSuccess }: ClientSummaryImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    processed?: number;
    errors?: string[];
    fuzzy_matches?: Array<{
      row: number;
      csv_name: string;
      matched_name: string;
    }>;
    skipped_entries?: number;
  } | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      const text = await selectedFile.text();
      setCsvText(text);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = `client_name,year,month,total_pickups,total_ptes,total_otr,total_tractor,total_revenue,total_weight_tons,total_volume_yards,first_pickup_date,last_pickup_date,notes
AutoZone Detroit,2025,1,5,425,0,0,10625.00,4.77,42.5,2025-01-05,2025-01-28,Regular monthly service
Michigan Tire Center,2025,1,3,276,0,0,6900.00,3.10,27.6,2025-01-10,2025-01-25,Large commercial account`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'client_summary_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const fixMissingRevenue = async () => {
    try {
      const response = await supabase.functions.invoke('fix-missing-revenue');
      if (response.error) {
        throw new Error(response.error.message);
      }
      setResult({
        success: true,
        message: `Fixed revenue calculation: ${response.data.message}`,
        processed: response.data.updated
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fix revenue',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      return;
    }

    setImporting(true);
    setProgress(10);
    setResult(null);

    try {
      setProgress(30);

      const response = await supabase.functions.invoke('client-summary-import', {
        body: { csvData: csvText }
      });

      setProgress(70);

      if (response.error) {
        throw new Error(response.error.message || 'Import failed');
      }

      setProgress(100);
      setResult(response.data);
      
      if (response.data.success && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }

    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setImporting(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-card-hover">
      <CardHeader className="border-b border-border/10">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-primary" />
          Import Client Summary Data
        </CardTitle>
        <CardDescription>
          Upload your 2025 client summary CSV file to import historical pickup data and analytics
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/10">
          <div>
            <h4 className="font-medium text-foreground">Need a template?</h4>
            <p className="text-sm text-muted-foreground">Download a sample CSV format</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-brand-primary file:text-white hover:file:bg-brand-primary-dark"
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        {/* CSV Text Preview */}
        {csvText && (
          <div className="space-y-2">
            <Label htmlFor="csv-preview">CSV Preview</Label>
            <Textarea
              id="csv-preview"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="font-mono text-sm bg-secondary/10"
              placeholder="Paste your CSV data here or select a file above..."
            />
          </div>
        )}

        {/* Import Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Importing client summaries...</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result && (
          <Alert className={result.success ? 'border-brand-success/20 bg-brand-success/5' : 'border-destructive/20 bg-destructive/5'}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-brand-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className="flex-1">
                <div className="font-medium">{result.message}</div>
                {result.processed && (
                  <div className="text-sm mt-1">
                    Successfully processed {result.processed} client summaries
                    {result.skipped_entries && result.skipped_entries > 0 && (
                      <span className="text-amber-600 ml-2">
                        ({result.skipped_entries} entries skipped due to unmatched client names)
                      </span>
                    )}
                  </div>
                )}
                {result.fuzzy_matches && result.fuzzy_matches.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Fuzzy Matches Applied ({result.fuzzy_matches.length}):
                    </div>
                    {result.fuzzy_matches.slice(0, 3).map((match, index) => (
                      <div key={index} className="text-sm text-amber-700 dark:text-amber-300">
                        • Row {match.row}: "{match.csv_name}" → "{match.matched_name}"
                      </div>
                    ))}
                    {result.fuzzy_matches.length > 3 && (
                      <div className="text-sm text-amber-600 dark:text-amber-400">
                        ... and {result.fuzzy_matches.length - 3} more fuzzy matches
                      </div>
                    )}
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-medium">Errors:</div>
                    {result.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-destructive">
                        • {error}
                      </div>
                    ))}
                    {result.errors.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {result.errors.length - 5} more errors
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Fix Missing Revenue Button */}
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">Missing Revenue Data?</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Click here to calculate revenue for existing summaries with $0 revenue
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fixMissingRevenue}
            disabled={importing}
            className="border-amber-500/50 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30"
          >
            Fix Revenue
          </Button>
        </div>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={!csvText.trim() || importing}
          className="w-full bg-brand-primary hover:bg-brand-primary-dark"
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? 'Importing...' : 'Import Client Summaries'}
        </Button>

        {/* Instructions */}
        <div className="p-4 bg-secondary/10 rounded-lg border border-border/10">
          <h4 className="font-medium text-foreground mb-2">CSV Format Requirements:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>client_name</strong>: Must match existing client company names</li>
            <li>• <strong>year</strong>: Year for the summary (typically 2025)</li>
            <li>• <strong>month</strong>: Month number (1-12), leave empty for annual totals</li>
            <li>• <strong>total_pickups</strong>: Number of completed pickups</li>
            <li>• <strong>total_ptes</strong>: Total passenger tire equivalents</li>
            <li>• <strong>total_revenue</strong>: Total revenue generated</li>
            <li>• <strong>first_pickup_date</strong>: Date of first pickup (YYYY-MM-DD)</li>
            <li>• <strong>last_pickup_date</strong>: Date of most recent pickup (YYYY-MM-DD)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}