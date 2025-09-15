import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AcroFormManifestData } from '@/types/acroform-manifest';

interface AcroFormManifestEditorProps {
  data: Partial<AcroFormManifestData>;
  onChange: (data: Partial<AcroFormManifestData>) => void;
  readonly?: boolean;
}

export const AcroFormManifestEditor: React.FC<AcroFormManifestEditorProps> = ({
  data,
  onChange,
  readonly = false,
}) => {
  const handleChange = (field: keyof AcroFormManifestData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle>Manifest Header</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manifest_number">Manifest Number</Label>
            <Input
              id="manifest_number"
              value={data.manifest_number || ''}
              onChange={(e) => handleChange('manifest_number', e.target.value)}
              readOnly={readonly}
            />
          </div>
          <div>
            <Label htmlFor="vehicle_trailer">Vehicle/Trailer #</Label>
            <Input
              id="vehicle_trailer"
              value={data.vehicle_trailer || ''}
              onChange={(e) => handleChange('vehicle_trailer', e.target.value)}
              readOnly={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Part 1: Generator Information */}
      <Card>
        <CardHeader>
          <CardTitle>Part 1: Scrap Tire Generator Certification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="generator_name">Generator Name</Label>
            <Input
              id="generator_name"
              value={data.generator_name || ''}
              onChange={(e) => handleChange('generator_name', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div>
            <Label htmlFor="generator_mail_address">Mailing Address</Label>
            <Input
              id="generator_mail_address"
              value={data.generator_mail_address || ''}
              onChange={(e) => handleChange('generator_mail_address', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="generator_city">City</Label>
              <Input
                id="generator_city"
                value={data.generator_city || ''}
                onChange={(e) => handleChange('generator_city', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_state">State</Label>
              <Input
                id="generator_state"
                value={data.generator_state || ''}
                onChange={(e) => handleChange('generator_state', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_zip">ZIP Code</Label>
              <Input
                id="generator_zip"
                value={data.generator_zip || ''}
                onChange={(e) => handleChange('generator_zip', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div>
            <Label htmlFor="generator_physical_address">Physical Address (Where Tires Were Removed)</Label>
            <Input
              id="generator_physical_address"
              value={data.generator_physical_address || ''}
              onChange={(e) => handleChange('generator_physical_address', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="generator_physical_city">City</Label>
              <Input
                id="generator_physical_city"
                value={data.generator_physical_city || ''}
                onChange={(e) => handleChange('generator_physical_city', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_physical_state">State</Label>
              <Input
                id="generator_physical_state"
                value={data.generator_physical_state || ''}
                onChange={(e) => handleChange('generator_physical_state', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_physical_zip">ZIP Code</Label>
              <Input
                id="generator_physical_zip"
                value={data.generator_physical_zip || ''}
                onChange={(e) => handleChange('generator_physical_zip', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="generator_county">County</Label>
              <Input
                id="generator_county"
                value={data.generator_county || ''}
                onChange={(e) => handleChange('generator_county', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_phone">Phone # (Including Area Code)</Label>
              <Input
                id="generator_phone"
                value={data.generator_phone || ''}
                onChange={(e) => handleChange('generator_phone', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="generator_volume_weight">Volume/Weight of Processed Tires</Label>
              <Textarea
                id="generator_volume_weight"
                value={data.generator_volume_weight || ''}
                onChange={(e) => handleChange('generator_volume_weight', e.target.value)}
                readOnly={readonly}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="generator_date_processed">Date Processed</Label>
              <Input
                id="generator_date_processed"
                type="date"
                value={data.generator_date_processed || ''}
                onChange={(e) => handleChange('generator_date_processed', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="generator_print_name">Print Name</Label>
              <Input
                id="generator_print_name"
                value={data.generator_print_name || ''}
                onChange={(e) => handleChange('generator_print_name', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="generator_date">Date</Label>
              <Input
                id="generator_date"
                type="date"
                value={data.generator_date || ''}
                onChange={(e) => handleChange('generator_date', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Part 2: Hauler Information */}
      <Card>
        <CardHeader>
          <CardTitle>Part 2: Scrap Tire Hauler Certification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hauler_mi_reg">MI Scrap Tire Hauler Reg. #</Label>
              <Input
                id="hauler_mi_reg"
                value={data.hauler_mi_reg || ''}
                onChange={(e) => handleChange('hauler_mi_reg', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_other_id">Other ID #</Label>
              <Input
                id="hauler_other_id"
                value={data.hauler_other_id || ''}
                onChange={(e) => handleChange('hauler_other_id', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hauler_name">Hauler Name</Label>
            <Input
              id="hauler_name"
              value={data.hauler_name || ''}
              onChange={(e) => handleChange('hauler_name', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div>
            <Label htmlFor="hauler_mail_address">Mailing Address</Label>
            <Input
              id="hauler_mail_address"
              value={data.hauler_mail_address || ''}
              onChange={(e) => handleChange('hauler_mail_address', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hauler_city">City</Label>
              <Input
                id="hauler_city"
                value={data.hauler_city || ''}
                onChange={(e) => handleChange('hauler_city', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_state">State</Label>
              <Input
                id="hauler_state"
                value={data.hauler_state || ''}
                onChange={(e) => handleChange('hauler_state', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_zip">ZIP Code</Label>
              <Input
                id="hauler_zip"
                value={data.hauler_zip || ''}
                onChange={(e) => handleChange('hauler_zip', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hauler_phone">Phone # (Including Area Code)</Label>
            <Input
              id="hauler_phone"
              value={data.hauler_phone || ''}
              onChange={(e) => handleChange('hauler_phone', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hauler_print_name">Print Name</Label>
              <Input
                id="hauler_print_name"
                value={data.hauler_print_name || ''}
                onChange={(e) => handleChange('hauler_print_name', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_date">Date</Label>
              <Input
                id="hauler_date"
                type="date"
                value={data.hauler_date || ''}
                onChange={(e) => handleChange('hauler_date', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="hauler_gross_weight">Gross Weight</Label>
              <Input
                id="hauler_gross_weight"
                value={data.hauler_gross_weight || ''}
                onChange={(e) => handleChange('hauler_gross_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_tare_weight">Tare Weight</Label>
              <Input
                id="hauler_tare_weight"
                value={data.hauler_tare_weight || ''}
                onChange={(e) => handleChange('hauler_tare_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_net_weight">Net Weight</Label>
              <Input
                id="hauler_net_weight"
                value={data.hauler_net_weight || ''}
                onChange={(e) => handleChange('hauler_net_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="hauler_total_pte">Total Passenger Tire Equivalents</Label>
              <Input
                id="hauler_total_pte"
                value={data.hauler_total_pte || ''}
                onChange={(e) => handleChange('hauler_total_pte', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Part 3: Receiving Location */}
      <Card>
        <CardHeader>
          <CardTitle>Part 3: Receiving Location Certification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="receiver_mi_reg">MI Scrap Tire Collection Site Reg. #</Label>
            <Input
              id="receiver_mi_reg"
              value={data.receiver_mi_reg || ''}
              onChange={(e) => handleChange('receiver_mi_reg', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div>
            <Label htmlFor="receiver_name">Receiver Name</Label>
            <Input
              id="receiver_name"
              value={data.receiver_name || ''}
              onChange={(e) => handleChange('receiver_name', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div>
            <Label htmlFor="receiver_physical_address">Physical Address</Label>
            <Input
              id="receiver_physical_address"
              value={data.receiver_physical_address || ''}
              onChange={(e) => handleChange('receiver_physical_address', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="receiver_city">City</Label>
              <Input
                id="receiver_city"
                value={data.receiver_city || ''}
                onChange={(e) => handleChange('receiver_city', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_state">State</Label>
              <Input
                id="receiver_state"
                value={data.receiver_state || ''}
                onChange={(e) => handleChange('receiver_state', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_zip">ZIP Code</Label>
              <Input
                id="receiver_zip"
                value={data.receiver_zip || ''}
                onChange={(e) => handleChange('receiver_zip', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="receiver_phone">Phone # (Including Area Code)</Label>
            <Input
              id="receiver_phone"
              value={data.receiver_phone || ''}
              onChange={(e) => handleChange('receiver_phone', e.target.value)}
              readOnly={readonly}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiver_print_name">Print Name</Label>
              <Input
                id="receiver_print_name"
                value={data.receiver_print_name || ''}
                onChange={(e) => handleChange('receiver_print_name', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_date">Date</Label>
              <Input
                id="receiver_date"
                type="date"
                value={data.receiver_date || ''}
                onChange={(e) => handleChange('receiver_date', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label htmlFor="receiver_gross_weight">Gross Weight</Label>
              <Input
                id="receiver_gross_weight"
                value={data.receiver_gross_weight || ''}
                onChange={(e) => handleChange('receiver_gross_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_total_pte">Total Passenger Tire Equivalents</Label>
              <Input
                id="receiver_total_pte"
                value={data.receiver_total_pte || ''}
                onChange={(e) => handleChange('receiver_total_pte', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_tare_weight">Tare Weight</Label>
              <Input
                id="receiver_tare_weight"
                value={data.receiver_tare_weight || ''}
                onChange={(e) => handleChange('receiver_tare_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
            <div>
              <Label htmlFor="receiver_net_weight">Net Weight</Label>
              <Input
                id="receiver_net_weight"
                value={data.receiver_net_weight || ''}
                onChange={(e) => handleChange('receiver_net_weight', e.target.value)}
                readOnly={readonly}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};