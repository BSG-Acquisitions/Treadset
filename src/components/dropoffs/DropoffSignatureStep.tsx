import { useState, useRef, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmployees } from "@/hooks/useEmployees";
import { Eraser, Pen, Type } from "lucide-react";

interface DropoffSignatureStepProps {
  title: string;
  description: string;
  signatureDataUrl: string | null;
  printName: string;
  onSignatureChange: (dataUrl: string | null) => void;
  onPrintNameChange: (name: string) => void;
  showEmployeeSelect?: boolean;
  hidePrintName?: boolean;
}

export const DropoffSignatureStep = ({
  title,
  description,
  signatureDataUrl,
  printName,
  onSignatureChange,
  onPrintNameChange,
  showEmployeeSelect = false,
  hidePrintName = false,
}: DropoffSignatureStepProps) => {
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const cursiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [signatureMode, setSignatureMode] = useState<"draw" | "typed">("typed");
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

  // Generate cursive signature from print name
  const generateCursiveSignature = useCallback((name: string): string | null => {
    if (!name.trim() || !cursiveCanvasRef.current) return null;
    
    const canvas = cursiveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 160;

    // Clear canvas with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Configure text style
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '48px "Dancing Script", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the name
    ctx.fillText(name.trim(), canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  }, []);

  // Update signature when in typed mode and print name changes
  useEffect(() => {
    if (signatureMode === 'typed' && printName.trim()) {
      const dataUrl = generateCursiveSignature(printName);
      if (dataUrl) {
        onSignatureChange(dataUrl);
      }
    }
  }, [printName, signatureMode, generateCursiveSignature, onSignatureChange]);

  // Load signature when employee is selected
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = employees?.find(emp => emp.id === employeeId);
    if (employee) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      onPrintNameChange(fullName);
      
      // Load saved signature if it exists - override any mode
      if (employee.signatureDataUrl) {
        onSignatureChange(employee.signatureDataUrl);
        // Switch to draw mode to show the loaded signature
        setSignatureMode("draw");
        if (sigCanvasRef.current) {
          sigCanvasRef.current.fromDataURL(employee.signatureDataUrl);
        }
      }
    }
  };

  // Check if selected employee has a saved signature
  const selectedEmployeeHasSavedSig = selectedEmployeeId 
    ? employees?.find(emp => emp.id === selectedEmployeeId)?.signatureDataUrl 
    : false;

  // Load initial signature if provided (draw mode)
  useEffect(() => {
    if (signatureDataUrl && sigCanvasRef.current && signatureMode === 'draw') {
      sigCanvasRef.current.fromDataURL(signatureDataUrl);
    }
  }, [signatureDataUrl, signatureMode]);

  const clearSignature = () => {
    if (signatureMode === 'draw') {
      sigCanvasRef.current?.clear();
    }
    onSignatureChange(null);
  };

  const handleSignatureEnd = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      onSignatureChange(sigCanvasRef.current.toDataURL());
    }
  };

  const handleModeChange = (value: string) => {
    if (value === 'draw' || value === 'typed') {
      setSignatureMode(value);
      // Clear signature when switching modes
      onSignatureChange(null);
      if (value === 'draw' && sigCanvasRef.current) {
        sigCanvasRef.current.clear();
      }
      // If switching to typed and we have a name, generate signature
      if (value === 'typed' && printName.trim()) {
        setTimeout(() => {
          const dataUrl = generateCursiveSignature(printName);
          if (dataUrl) {
            onSignatureChange(dataUrl);
          }
        }, 50);
      }
    }
  };

  const isSignatureValid = signatureDataUrl && printName.trim().length > 0;

  // For receiver with employee select and saved signature, hide mode toggle
  const hideModeToogle = showEmployeeSelect && selectedEmployeeHasSavedSig;

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

        {!hidePrintName && (
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
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Signature *</Label>
            <div className="flex items-center gap-2">
              {!hideModeToogle && (
                <ToggleGroup 
                  type="single" 
                  value={signatureMode} 
                  onValueChange={handleModeChange}
                  className="border rounded-md"
                >
                  <ToggleGroupItem value="draw" aria-label="Draw signature" className="px-3 py-1 text-xs">
                    <Pen className="h-3 w-3 mr-1" />
                    Draw
                  </ToggleGroupItem>
                  <ToggleGroupItem value="typed" aria-label="Type signature" className="px-3 py-1 text-xs">
                    <Type className="h-3 w-3 mr-1" />
                    Type
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
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
          </div>

          {/* Hidden canvas for generating cursive signatures */}
          <canvas 
            ref={cursiveCanvasRef} 
            style={{ display: 'none' }} 
            width={400} 
            height={160}
          />

          {signatureMode === 'draw' ? (
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
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg bg-white p-4 h-40 flex items-center justify-center">
              {printName.trim() ? (
                <span 
                  className="text-4xl text-gray-800"
                  style={{ fontFamily: '"Dancing Script", cursive' }}
                >
                  {printName}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Enter a name above to generate cursive signature
                </span>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            {signatureMode === 'draw' 
              ? 'Draw signature above using mouse or touch'
              : 'Signature will be auto-generated from the print name in cursive'
            }
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
