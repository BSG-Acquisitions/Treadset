import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadAllTemplates } from "@/utils/uploadTemplate";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const TemplateUploadUtility = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadResults(null);
    
    try {
      const results = await uploadAllTemplates();
      setUploadResults(results);
      
      if (results.errors.length === 0) {
        toast({
          title: "Templates Uploaded",
          description: "All PDF templates uploaded successfully to storage.",
        });
      } else {
        toast({
          title: "Partial Upload",
          description: `${results.errors.length} template(s) failed to upload.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload templates",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          PDF Template Uploader
        </CardTitle>
        <CardDescription>
          Upload Michigan AcroForm manifest templates to Supabase storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>This utility uploads the following templates to Supabase storage:</p>
          <ul className="list-disc list-inside ml-4">
            <li>Michigan_Manifest_AcroForm.pdf (v3 - legacy)</li>
            <li>Michigan_Manifest_AcroForm_V4.pdf (v4 - current)</li>
          </ul>
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading Templates...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Templates to Storage
            </>
          )}
        </Button>

        {uploadResults && (
          <div className="space-y-2">
            {uploadResults.v3 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ v3 Template uploaded: {uploadResults.v3.path}
                </AlertDescription>
              </Alert>
            )}
            
            {uploadResults.v4 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ v4 Template uploaded: {uploadResults.v4.path}
                </AlertDescription>
              </Alert>
            )}
            
            {uploadResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Upload Errors:</div>
                  {uploadResults.errors.map((err: string, i: number) => (
                    <div key={i} className="text-sm">• {err}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
