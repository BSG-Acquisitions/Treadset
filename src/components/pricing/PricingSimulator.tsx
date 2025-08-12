import React, { useState, useEffect } from 'react';
import { priceFor } from '@/lib/pricing/priceFor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import type { TireCategory, ServiceMode, RimStatus, PriceForResult } from '@/lib/pricing/types';

interface PricingSimulatorProps {
  organizationId: string;
}

export const PricingSimulator: React.FC<PricingSimulatorProps> = ({ organizationId }) => {
  const [inputs, setInputs] = useState({
    tireCategory: 'passenger' as TireCategory,
    serviceMode: 'pickup' as ServiceMode,
    rim: 'off' as RimStatus,
    quantity: 4,
    tireSizeInches: 15,
    distanceKm: 10,
    historicalVolume: 0
  });
  
  const [result, setResult] = useState<PriceForResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculatePrice = async () => {
    setIsCalculating(true);
    try {
      const priceResult = await priceFor({
        orgId: organizationId,
        date: new Date(),
        tireCategory: inputs.tireCategory,
        serviceMode: inputs.serviceMode,
        rim: inputs.rim,
        quantity: inputs.quantity,
        tireSizeInches: inputs.tireSizeInches,
        distanceKm: inputs.distanceKm,
        historicalClientMonthlyVolume: inputs.historicalVolume
      });
      setResult(priceResult);
    } catch (error) {
      console.error('Error calculating price:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [inputs, organizationId]);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge className="bg-green-500">High Confidence</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    return <Badge variant="destructive">Low Confidence</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pricing Simulator
        </CardTitle>
        <CardDescription>
          Test pricing scenarios and see how the engine calculates prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Controls */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tire_category">Tire Category</Label>
            <Select value={inputs.tireCategory} onValueChange={(value) => 
              setInputs({...inputs, tireCategory: value as TireCategory})
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passenger">Passenger</SelectItem>
                <SelectItem value="commercial_17_5_19_5">Commercial 17.5-19.5"</SelectItem>
                <SelectItem value="commercial_22_5">Commercial 22.5"</SelectItem>
                <SelectItem value="otr">OTR</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="service_mode">Service Mode</Label>
            <Select value={inputs.serviceMode} onValueChange={(value) => 
              setInputs({...inputs, serviceMode: value as ServiceMode})
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="dropoff">Drop-off</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="rim">Rim Status</Label>
            <Select value={inputs.rim} onValueChange={(value) => 
              setInputs({...inputs, rim: value as RimStatus})
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Rim Off</SelectItem>
                <SelectItem value="on">Rim On</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              type="number"
              value={inputs.quantity}
              onChange={(e) => setInputs({...inputs, quantity: parseInt(e.target.value) || 1})}
              min="1"
            />
          </div>
          
          <div>
            <Label htmlFor="tire_size">Tire Size (inches)</Label>
            <Input
              type="number"
              value={inputs.tireSizeInches}
              onChange={(e) => setInputs({...inputs, tireSizeInches: parseInt(e.target.value) || 15})}
              min="10"
              max="30"
            />
          </div>
          
          <div>
            <Label htmlFor="distance">Distance (km)</Label>
            <Input
              type="number"
              value={inputs.distanceKm}
              onChange={(e) => setInputs({...inputs, distanceKm: parseInt(e.target.value) || 0})}
              min="0"
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="historical_volume">Historical Monthly Volume</Label>
            <Input
              type="number"
              value={inputs.historicalVolume}
              onChange={(e) => setInputs({...inputs, historicalVolume: parseInt(e.target.value) || 0})}
              min="0"
              placeholder="Client's average monthly tire volume"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-primary">
                ${result.totalPrice.toFixed(2)} total
              </div>
              <div className="text-lg text-muted-foreground">
                (${result.unitPrice.toFixed(2)} per tire)
              </div>
              {getConfidenceBadge(result.confidence)}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {result.rationale}
            </div>
            
            {/* Price Breakdown */}
            <div className="space-y-2">
              <h4 className="font-medium">Price Breakdown:</h4>
              {result.components.map((component, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    {component.label}
                    <Badge 
                      variant={component.type === 'base' ? 'default' : 
                               component.type === 'surcharge' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {component.type}
                    </Badge>
                  </span>
                  <span className={component.value < 0 ? 'text-green-600' : ''}>
                    {component.value >= 0 ? '+' : ''}${component.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-600">Warnings:</h4>
                {result.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600">
                    • {warning}
                  </div>
                ))}
              </div>
            )}
            
            {/* Audit Info */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div>Source: {result.source}</div>
              <div>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
              <div>Calculated: {new Date(result.audit.timestamp).toLocaleString()}</div>
              {result.audit.matchedRowId && (
                <div>Matched Rule ID: {result.audit.matchedRowId}</div>
              )}
            </div>
          </div>
        )}
        
        {isCalculating && (
          <div className="text-center text-muted-foreground">
            Calculating pricing...
          </div>
        )}
      </CardContent>
    </Card>
  );
};