import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SignatureCanvas from "react-signature-canvas";
import { PenTool, Trash2, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const SignatureManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!user?.signatureDataUrl);

  // Load existing signature when component mounts
  useEffect(() => {
    if (user?.signatureDataUrl && sigCanvasRef.current) {
      sigCanvasRef.current.fromDataURL(user.signatureDataUrl);
      setHasSignature(true);
    }
  }, [user?.signatureDataUrl]);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast({
        title: "No signature",
        description: "Please draw your signature before saving",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const signatureDataURL = sigCanvasRef.current.toDataURL();
      
      const { error } = await supabase
        .from('users')
        .update({ signature_data_url: signatureDataURL })
        .eq('id', user?.id);

      if (error) throw error;

      setHasSignature(true);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast({
        title: "Signature saved",
        description: "Your signature will be automatically loaded when signing manifests"
      });
    } catch (error: any) {
      console.error('Failed to save signature:', error);
      toast({
        title: "Save failed",
        description: error?.message || "Failed to save signature",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ signature_data_url: null })
        .eq('id', user?.id);

      if (error) throw error;

      sigCanvasRef.current?.clear();
      setHasSignature(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast({
        title: "Signature removed",
        description: "You will need to sign manually when completing manifests"
      });
    } catch (error: any) {
      console.error('Failed to delete signature:', error);
      toast({
        title: "Delete failed",
        description: error?.message || "Failed to remove signature",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card id="signature-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          My Signature
        </CardTitle>
        <CardDescription>
          Save your signature to automatically fill it when signing receiver manifests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label>Draw Your Signature</Label>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 bg-muted/10">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 500,
                height: 200,
                className: 'signature-canvas w-full h-48 border border-border rounded bg-background'
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {hasSignature 
              ? "You have a saved signature. Draw a new one and click Save to update it."
              : "Draw your signature above. It will be automatically loaded when you sign manifests."}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isSaving}
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Signature
              </>
            )}
          </Button>

          {hasSignature && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Saved
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
