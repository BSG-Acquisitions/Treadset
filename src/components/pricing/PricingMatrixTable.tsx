import React, { useState } from 'react';
import { usePriceMatrix, useUpdatePriceMatrix, useCreatePriceMatrix } from '@/hooks/usePricingEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, AlertTriangle } from 'lucide-react';
import type { TireCategory, ServiceMode, RimStatus, PriceSource } from '@/lib/pricing/types';

interface PricingMatrixTableProps {
  organizationId: string;
}

export const PricingMatrixTable: React.FC<PricingMatrixTableProps> = ({ organizationId }) => {
  const { data: priceMatrix, isLoading } = usePriceMatrix(organizationId);
  const updateMatrix = useUpdatePriceMatrix();
  const createMatrix = useCreatePriceMatrix();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    tire_category: 'passenger' as TireCategory,
    service_mode: 'pickup' as ServiceMode,
    rim: 'off' as RimStatus,
    unit_price: 0,
    notes: ''
  });

  const handlePriceEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditValue(currentPrice);
  };

  const handlePriceSave = async (id: string) => {
    await updateMatrix.mutateAsync({
      id,
      updates: { unit_price: editValue }
    });
    setEditingId(null);
  };

  const handleCreateEntry = async () => {
    await createMatrix.mutateAsync({
      ...newEntry,
      organization_id: organizationId,
      priority: 100,
      effective_from: new Date().toISOString(),
      source: 'admin_manual' as PriceSource,
      needs_confirmation: false
    });
    setShowCreateDialog(false);
    setNewEntry({
      tire_category: 'passenger',
      service_mode: 'pickup',
      rim: 'off',
      unit_price: 0,
      notes: ''
    });
  };

  const getSourceBadge = (source: PriceSource, needsConfirmation: boolean) => {
    if (needsConfirmation) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Needs Confirmation</Badge>;
    }
    
    switch (source) {
      case 'org_default':
        return <Badge variant="secondary">Org Default</Badge>;
      case 'admin_manual':
        return <Badge variant="default">Admin Manual</Badge>;
      case 'smart_suggested':
        return <Badge variant="outline">Smart Suggested</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading pricing matrix...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pricing Matrix</CardTitle>
            <CardDescription>
              Manage base pricing for different tire categories, service modes, and rim configurations
            </CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Pricing Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tire_category">Tire Category</Label>
                    <Select value={newEntry.tire_category} onValueChange={(value) => 
                      setNewEntry({...newEntry, tire_category: value as TireCategory})
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
                    <Select value={newEntry.service_mode} onValueChange={(value) => 
                      setNewEntry({...newEntry, service_mode: value as ServiceMode})
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rim">Rim Status</Label>
                    <Select value={newEntry.rim} onValueChange={(value) => 
                      setNewEntry({...newEntry, rim: value as RimStatus})
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
                    <Label htmlFor="unit_price">Unit Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newEntry.unit_price}
                      onChange={(e) => setNewEntry({...newEntry, unit_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    value={newEntry.notes}
                    onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                    placeholder="Optional notes about this pricing entry"
                  />
                </div>
                <Button onClick={handleCreateEntry} disabled={createMatrix.isPending}>
                  {createMatrix.isPending ? 'Creating...' : 'Create Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Service Mode</TableHead>
              <TableHead>Rim Status</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceMatrix?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.tire_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </TableCell>
                <TableCell>
                  {entry.service_mode.charAt(0).toUpperCase() + entry.service_mode.slice(1)}
                </TableCell>
                <TableCell>
                  {entry.rim === 'off' ? 'Rim Off' : entry.rim === 'on' ? 'Rim On' : 'Any'}
                </TableCell>
                <TableCell>
                  {editingId === entry.id ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                      <Button size="sm" onClick={() => handlePriceSave(entry.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      ${entry.unit_price.toFixed(2)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePriceEdit(entry.id, entry.unit_price)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {getSourceBadge(entry.source, entry.needs_confirmation)}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {entry.notes || 'No notes'}
                  </span>
                </TableCell>
                <TableCell>
                  {entry.needs_confirmation && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMatrix.mutateAsync({
                        id: entry.id,
                        updates: { needs_confirmation: false }
                      })}
                    >
                      Confirm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};