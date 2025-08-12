import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCSVImport, parseCSV, generateCSVTemplate } from "@/hooks/useCSVImport";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { Upload, Download, AlertTriangle, CheckCircle, FileText } from "lucide-react";

const importSchema = z.object({
  csvFile: z.any().optional(),
  csvText: z.string().min(1, "CSV content is required")
});

type ImportData = z.infer<typeof importSchema>;

interface CSVImportDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CSVImportDialog({ trigger, onSuccess }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  const csvImport = useCSVImport();
  const { data: pricingTiers = [] } = usePricingTiers();

  const form = useForm<ImportData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      csvText: ""
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        form.setValue('csvText', text);
        handleParseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const handleParseCSV = (csvText: string) => {
    try {
      const data = parseCSV(csvText);
      setParsedData(data);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing CSV:', error);
    }
  };

  const handleValidateAndPreview = async () => {
    try {
      const result = await csvImport.mutateAsync({
        csvData: parsedData,
        dryRun: true
      });
      setImportResult(result);
      setStep('confirm');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleFinalImport = async () => {
    try {
      const result = await csvImport.mutateAsync({
        csvData: parsedData,
        dryRun: false
      });
      setImportResult(result);
      onSuccess?.();
      setOpen(false);
      handleReset();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParsedData([]);
    setImportResult(null);
    form.reset();
  };

  const downloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clients_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const requiredColumns = [
    'clientName', 'type', 'contactName', 'email', 'phone', 
    'locationName', 'address', 'notes', 'tags', 'pricingTierName'
  ];

  const availablePricingTiers = pricingTiers.map(pt => pt.name).join(', ');

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) handleReset();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Clients & Locations</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Upload a CSV file with client and location data. 
                <Button 
                  variant="link" 
                  className="p-0 ml-1 h-auto"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Template
                </Button>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Upload CSV File</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>

              <div className="text-center text-muted-foreground">or</div>

              <Form {...form}>
                <FormField
                  control={form.control}
                  name="csvText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paste CSV Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste your CSV content here..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>

              <Button 
                onClick={() => handleParseCSV(form.getValues('csvText'))}
                disabled={!form.getValues('csvText')}
                className="w-full"
              >
                Parse CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Required Columns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {requiredColumns.map(col => (
                    <div key={col} className="flex items-center gap-2">
                      <Badge variant="outline">{col}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p><strong>Notes:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>clientName is required</li>
                    <li>type: commercial, residential, or industrial</li>
                    <li>phone: E.164 format (+1234567890)</li>
                    <li>tags: semicolon-separated (tag1;tag2;tag3)</li>
                    <li>Available pricing tiers: {availablePricingTiers}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Preview Data ({parsedData.length} rows)</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handleValidateAndPreview} disabled={csvImport.isPending}>
                  {csvImport.isPending ? 'Validating...' : 'Validate & Continue'}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Client Name</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Contact</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{row.clientName}</td>
                      <td className="p-2">{row.type}</td>
                      <td className="p-2">{row.contactName}</td>
                      <td className="p-2">{row.email}</td>
                      <td className="p-2">{row.locationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <div className="p-2 text-center text-muted-foreground text-sm border-t">
                  ... and {parsedData.length - 10} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'confirm' && importResult && (
          <div className="space-y-4">
            {importResult.success ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Validation successful! Ready to import.
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Clients to Import</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{importResult.preview.totalClients}</p>
                      <p className="text-sm text-muted-foreground">
                        New and updated clients
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Locations to Import</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{importResult.preview.totalLocations}</p>
                      <p className="text-sm text-muted-foreground">
                        New and updated locations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep('preview')}>
                    Back to Preview
                  </Button>
                  <Button onClick={handleFinalImport} disabled={csvImport.isPending}>
                    {csvImport.isPending ? 'Importing...' : 'Confirm Import'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Validation failed. Please fix the errors below.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {importResult.errors?.map((error: any, index: number) => (
                    <div key={index} className="p-3 border border-destructive/20 rounded-md bg-destructive/5">
                      <p className="text-sm">
                        <strong>Row {error.row}, Field "{error.field}":</strong> {error.message}
                      </p>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back to Upload
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}