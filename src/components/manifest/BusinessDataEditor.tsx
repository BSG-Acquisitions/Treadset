import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ManifestBusinessData } from '@/types/acroform-manifest';

interface BusinessDataEditorProps {
  data: Partial<ManifestBusinessData>;
  onChange: (data: Partial<ManifestBusinessData>) => void;
  readonly?: boolean;
}

export const BusinessDataEditor: React.FC<BusinessDataEditorProps> = ({
  data,
  onChange,
  readonly = false,
}) => {
  const handleTireCountChange = (field: keyof ManifestBusinessData, value: string) => {
    const numValue = parseInt(value) || 0;
    const newData = { ...data, [field]: numValue };
    
    // Recalculate totals when tire counts change
    if (field.includes('pte') || field.includes('commercial') || field.includes('otr') || field.includes('tractor')) {
      recalculateTotal(newData);
    }
    
    onChange(newData);
  };

  const handlePriceChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newData = {
      ...data,
      unit_prices: {
        ...data.unit_prices,
        [category]: numValue,
      },
    };
    
    recalculateTotal(newData);
    onChange(newData);
  };

  const recalculateTotal = (newData: Partial<ManifestBusinessData>) => {
    const counts = {
      pte_off_rim: newData.pte_off_rim || 0,
      pte_on_rim: newData.pte_on_rim || 0,
      commercial_17_5_19_5_off: newData.commercial_17_5_19_5_off || 0,
      commercial_17_5_19_5_on: newData.commercial_17_5_19_5_on || 0,
      commercial_22_5_off: newData.commercial_22_5_off || 0,
      commercial_22_5_on: newData.commercial_22_5_on || 0,
      otr_count: newData.otr_count || 0,
      tractor_count: newData.tractor_count || 0,
    };

    const prices = newData.unit_prices || {
      pte_off_rim: 0,
      pte_on_rim: 0,
      commercial_17_5_19_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_22_5_off: 0,
      commercial_22_5_on: 0,
      otr: 0,
      tractor: 0,
    };

    const subtotal = 
      (counts.pte_off_rim * (prices.pte_off_rim || 0)) +
      (counts.pte_on_rim * (prices.pte_on_rim || 0)) +
      (counts.commercial_17_5_19_5_off * (prices.commercial_17_5_19_5_off || 0)) +
      (counts.commercial_17_5_19_5_on * (prices.commercial_17_5_19_5_on || 0)) +
      (counts.commercial_22_5_off * (prices.commercial_22_5_off || 0)) +
      (counts.commercial_22_5_on * (prices.commercial_22_5_on || 0)) +
      (counts.otr_count * (prices.otr || 0)) +
      (counts.tractor_count * (prices.tractor || 0));

    const surcharges = newData.surcharges || 0;
    const total = subtotal + surcharges;

    newData.subtotal = subtotal;
    newData.total = total;
  };

  return (
    <div className="space-y-6">
      {/* Tire Counts for Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Tire Inventory for Pricing</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown for pricing calculations (separate from state compliance totals)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pte_off_rim">PTE Off Rim</Label>
              <Input
                id="pte_off_rim"
                type="number"
                value={data.pte_off_rim || 0}
                onChange={(e) => handleTireCountChange('pte_off_rim', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="pte_on_rim">PTE On Rim</Label>
              <Input
                id="pte_on_rim"
                type="number"
                value={data.pte_on_rim || 0}
                onChange={(e) => handleTireCountChange('pte_on_rim', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commercial_17_5_19_5_off">Commercial 17.5-19.5 Off Rim</Label>
              <Input
                id="commercial_17_5_19_5_off"
                type="number"
                value={data.commercial_17_5_19_5_off || 0}
                onChange={(e) => handleTireCountChange('commercial_17_5_19_5_off', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="commercial_17_5_19_5_on">Commercial 17.5-19.5 On Rim</Label>
              <Input
                id="commercial_17_5_19_5_on"
                type="number"
                value={data.commercial_17_5_19_5_on || 0}
                onChange={(e) => handleTireCountChange('commercial_17_5_19_5_on', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commercial_22_5_off">Commercial 22.5+ Off Rim</Label>
              <Input
                id="commercial_22_5_off"
                type="number"
                value={data.commercial_22_5_off || 0}
                onChange={(e) => handleTireCountChange('commercial_22_5_off', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="commercial_22_5_on">Commercial 22.5+ On Rim</Label>
              <Input
                id="commercial_22_5_on"
                type="number"
                value={data.commercial_22_5_on || 0}
                onChange={(e) => handleTireCountChange('commercial_22_5_on', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="otr_count">OTR Count</Label>
              <Input
                id="otr_count"
                type="number"
                value={data.otr_count || 0}
                onChange={(e) => handleTireCountChange('otr_count', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="tractor_count">Tractor Count</Label>
              <Input
                id="tractor_count"
                type="number"
                value={data.tractor_count || 0}
                onChange={(e) => handleTireCountChange('tractor_count', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_pte_off_rim">PTE Off Rim Price</Label>
              <Input
                id="price_pte_off_rim"
                type="number"
                step="0.01"
                value={data.unit_prices?.pte_off_rim || ''}
                onChange={(e) => handlePriceChange('pte_off_rim', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="price_pte_on_rim">PTE On Rim Price</Label>
              <Input
                id="price_pte_on_rim"
                type="number"
                step="0.01"
                value={data.unit_prices?.pte_on_rim || ''}
                onChange={(e) => handlePriceChange('pte_on_rim', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_commercial_17_5_19_5_off">Commercial 17.5-19.5 Off Price</Label>
              <Input
                id="price_commercial_17_5_19_5_off"
                type="number"
                step="0.01"
                value={data.unit_prices?.commercial_17_5_19_5_off || ''}
                onChange={(e) => handlePriceChange('commercial_17_5_19_5_off', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="price_commercial_17_5_19_5_on">Commercial 17.5-19.5 On Price</Label>
              <Input
                id="price_commercial_17_5_19_5_on"
                type="number" 
                step="0.01"
                value={data.unit_prices?.commercial_17_5_19_5_on || ''}
                onChange={(e) => handlePriceChange('commercial_17_5_19_5_on', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_commercial_22_5_off">Commercial 22.5+ Off Price</Label>
              <Input
                id="price_commercial_22_5_off"
                type="number"
                step="0.01"
                value={data.unit_prices?.commercial_22_5_off || ''}
                onChange={(e) => handlePriceChange('commercial_22_5_off', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="price_commercial_22_5_on">Commercial 22.5+ On Price</Label>
              <Input
                id="price_commercial_22_5_on"
                type="number"
                step="0.01"
                value={data.unit_prices?.commercial_22_5_on || ''}
                onChange={(e) => handlePriceChange('commercial_22_5_on', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_otr">OTR Price</Label>
              <Input
                id="price_otr"
                type="number"
                step="0.01"
                value={data.unit_prices?.otr || ''}
                onChange={(e) => handlePriceChange('otr', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="price_tractor">Tractor Price</Label>
              <Input
                id="price_tractor"
                type="number"
                step="0.01"
                value={data.unit_prices?.tractor || ''}
                onChange={(e) => handlePriceChange('tractor', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={data.subtotal || 0}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="surcharges">Surcharges</Label>
              <Input
                id="surcharges"
                type="number"
                step="0.01"
                value={data.surcharges || 0}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value) || 0;
                  const newData = { ...data, surcharges: numValue };
                  newData.total = (newData.subtotal || 0) + numValue;
                  onChange(newData);
                }}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={data.total || 0}
                readOnly
                className="bg-muted font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={data.payment_method}
                onValueChange={(value) => onChange({ ...data, payment_method: value as any })}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={data.payment_status}
                onValueChange={(value) => onChange({ ...data, payment_status: value as any })}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paid_amount">Paid Amount</Label>
              <Input
                id="paid_amount"
                type="number"
                step="0.01"
                value={data.paid_amount || 0}
                onChange={(e) => onChange({ ...data, paid_amount: parseFloat(e.target.value) || 0 })}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};