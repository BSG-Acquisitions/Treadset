import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import { Eraser, Pen } from "lucide-react";

interface DropoffSignatureStepProps {
  title: string;
  description: string;
  signatureDataUrl: string | null;
  printName: string;
  onSignatureChange: (dataUrl: string | null) => void;
  onPrintNameChange: (name: string) => void;
  showEmployeeSelect?: boolean;
}

export const DropoffSignatureStep = ({
  title,
  description,
  signatureDataUrl,
  printName,
  onSignatureChange,
  onPrintNameChange,
  showEmployeeSelect = false,
}: DropoffSignatureStepProps) => {
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { data: employees } = useEmployees();

  // Get print name options from active employees
  const printNameOptions = employees
    ?.filter(emp => emp.isActive)
    ?.map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      signatureDataUrl: emp.signatureDataUrl
    }))
    ?.filter(opt => opt.name.length > 0) || [];

  // Load signature when employee is selected
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      onPrintNameChange(fullName);
      
      // Load saved signature if it exists
      if (employee.signatureDataUrl) {
        onSignatureChange(employee.signatureDataUrl);
        if (sigCanvasRef.current) {
          sigCanvasRef.current.fromDataURL(employee.signatureDataUrl);
        }
      }
    }
  };

  // Load initial signature if provided
  useEffect(() => {
    if (signatureDataUrl && sigCanvasRef.current) {
      sigCanvasRef.current.fromDataURL(signatureDataUrl);
    }
  }, [signatureDataUrl]);

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
    onSignatureChange(null);
  };

  const handleSignatureEnd = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      onSignatureChange(sigCanvasRef.current.toDataURL());
    }
  };

  const isSignatureValid = signatureDataUrl && printName.trim().length > 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pen className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showEmployeeSelect && printNameOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Select Employee (Optional)</Label>
            <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Choose an employee with saved signature..." />
              </SelectTrigger>
              <SelectContent className="bg-background border border-input shadow-lg z-[100]">
                {printNameOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <div className="flex items-center gap-2">
                      {opt.name}
                      {opt.signatureDataUrl && (
                        <span className="text-xs text-muted-foreground">(saved signature)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="printName">Print Name *</Label>
          <Input
            id="printName"
            placeholder="Enter signer's name"
            value={printName}
            onChange={(e) => {
              onPrintNameChange(e.target.value);
              if (showEmployeeSelect) {
                setSelectedEmployeeId(""); // Clear employee selection if custom name entered
              }
            }}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Signature *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="h-8 text-muted-foreground"
            >
              <Eraser className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg bg-background p-1">
            <SignatureCanvas
              ref={(ref) => { sigCanvasRef.current = ref; }}
              canvasProps={{
                className: "w-full h-40 rounded",
                style: { width: '100%', height: '160px' }
              }}
              backgroundColor="white"
              onEnd={handleSignatureEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Draw signature above using mouse or touch
          </p>
        </div>

        {isSignatureValid && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-2">
            <span className="font-medium">✓ Signature captured for {printName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
