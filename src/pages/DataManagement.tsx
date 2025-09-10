import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Hauler {
  id: string;
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
  hauler_mi_reg?: string;
  is_active: boolean;
}

interface Receiver {
  id: string;
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
  receiver_phone?: string;
  is_active: boolean;
}

interface HaulerFormData {
  hauler_name: string;
  hauler_mailing_address: string;
  hauler_city: string;
  hauler_state: string;
  hauler_zip: string;
  hauler_phone: string;
  hauler_mi_reg: string;
}

interface ReceiverFormData {
  receiver_name: string;
  receiver_mailing_address: string;
  receiver_city: string;
  receiver_state: string;
  receiver_zip: string;
  receiver_phone: string;
}

export default function DataManagement() {
  const { toast } = useToast();
  const [haulers, setHaulers] = useState<Hauler[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [haulerDialogOpen, setHaulerDialogOpen] = useState(false);
  const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);
  const [editingHauler, setEditingHauler] = useState<Hauler | null>(null);
  const [editingReceiver, setEditingReceiver] = useState<Receiver | null>(null);
  
  // Form states
  const [haulerForm, setHaulerForm] = useState<HaulerFormData>({
    hauler_name: "",
    hauler_mailing_address: "",
    hauler_city: "",
    hauler_state: "",
    hauler_zip: "",
    hauler_phone: "",
    hauler_mi_reg: ""
  });

  const [receiverForm, setReceiverForm] = useState<ReceiverFormData>({
    receiver_name: "",
    receiver_mailing_address: "",
    receiver_city: "",
    receiver_state: "",
    receiver_zip: "",
    receiver_phone: ""
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Use raw SQL queries since tables aren't in TypeScript types
      const [haulersResponse, receiversResponse] = await Promise.all([
        supabase.rpc('exec_sql', { 
          query: 'SELECT * FROM haulers ORDER BY hauler_name' 
        }),
        supabase.rpc('exec_sql', { 
          query: 'SELECT * FROM receivers ORDER BY receiver_name' 
        })
      ]);

      if (haulersResponse.error) throw haulersResponse.error;
      if (receiversResponse.error) throw receiversResponse.error;

      setHaulers(haulersResponse.data || []);
      setReceivers(receiversResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Fetch failed",
        description: error.message || "Failed to fetch data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetHaulerForm = () => {
    setHaulerForm({
      hauler_name: "",
      hauler_mailing_address: "",
      hauler_city: "",
      hauler_state: "",
      hauler_zip: "",
      hauler_phone: "",
      hauler_mi_reg: ""
    });
    setEditingHauler(null);
  };

  const resetReceiverForm = () => {
    setReceiverForm({
      receiver_name: "",
      receiver_mailing_address: "",
      receiver_city: "",
      receiver_state: "",
      receiver_zip: "",
      receiver_phone: ""
    });
    setEditingReceiver(null);
  };

  const openHaulerDialog = (hauler?: Hauler) => {
    if (hauler) {
      setEditingHauler(hauler);
      setHaulerForm({
        hauler_name: hauler.hauler_name,
        hauler_mailing_address: hauler.hauler_mailing_address || "",
        hauler_city: hauler.hauler_city || "",
        hauler_state: hauler.hauler_state || "",
        hauler_zip: hauler.hauler_zip || "",
        hauler_phone: hauler.hauler_phone || "",
        hauler_mi_reg: hauler.hauler_mi_reg || ""
      });
    } else {
      resetHaulerForm();
    }
    setHaulerDialogOpen(true);
  };

  const openReceiverDialog = (receiver?: Receiver) => {
    if (receiver) {
      setEditingReceiver(receiver);
      setReceiverForm({
        receiver_name: receiver.receiver_name,
        receiver_mailing_address: receiver.receiver_mailing_address || "",
        receiver_city: receiver.receiver_city || "",
        receiver_state: receiver.receiver_state || "",
        receiver_zip: receiver.receiver_zip || "",
        receiver_phone: receiver.receiver_phone || ""
      });
    } else {
      resetReceiverForm();
    }
    setReceiverDialogOpen(true);
  };

  const saveHauler = async () => {
    if (!haulerForm.hauler_name.trim()) {
      toast({
        title: "Validation error",
        description: "Hauler name is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      if (editingHauler) {
        const updateQuery = `
          UPDATE haulers SET 
            hauler_name = '${haulerForm.hauler_name.replace(/'/g, "''")}',
            hauler_mailing_address = '${haulerForm.hauler_mailing_address.replace(/'/g, "''")}',
            hauler_city = '${haulerForm.hauler_city.replace(/'/g, "''")}',
            hauler_state = '${haulerForm.hauler_state.replace(/'/g, "''")}',
            hauler_zip = '${haulerForm.hauler_zip.replace(/'/g, "''")}',
            hauler_phone = '${haulerForm.hauler_phone.replace(/'/g, "''")}',
            hauler_mi_reg = '${haulerForm.hauler_mi_reg.replace(/'/g, "''")}'
          WHERE id = '${editingHauler.id}'
        `;
        
        const { error } = await supabase.rpc('exec_sql', { query: updateQuery });
        if (error) throw error;
        
        toast({
          title: "Hauler updated",
          description: "Hauler has been updated successfully."
        });
      } else {
        const insertQuery = `
          INSERT INTO haulers (hauler_name, hauler_mailing_address, hauler_city, hauler_state, hauler_zip, hauler_phone, hauler_mi_reg, is_active)
          VALUES (
            '${haulerForm.hauler_name.replace(/'/g, "''")}',
            '${haulerForm.hauler_mailing_address.replace(/'/g, "''")}',
            '${haulerForm.hauler_city.replace(/'/g, "''")}',
            '${haulerForm.hauler_state.replace(/'/g, "''")}',
            '${haulerForm.hauler_zip.replace(/'/g, "''")}',
            '${haulerForm.hauler_phone.replace(/'/g, "''")}',
            '${haulerForm.hauler_mi_reg.replace(/'/g, "''")}',
            true
          )
        `;
        
        const { error } = await supabase.rpc('exec_sql', { query: insertQuery });
        if (error) throw error;
        
        toast({
          title: "Hauler created",
          description: "New hauler has been created successfully."
        });
      }

      setHaulerDialogOpen(false);
      resetHaulerForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving hauler:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save hauler.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveReceiver = async () => {
    if (!receiverForm.receiver_name.trim()) {
      toast({
        title: "Validation error",
        description: "Receiver name is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      if (editingReceiver) {
        const updateQuery = `
          UPDATE receivers SET 
            receiver_name = '${receiverForm.receiver_name.replace(/'/g, "''")}',
            receiver_mailing_address = '${receiverForm.receiver_mailing_address.replace(/'/g, "''")}',
            receiver_city = '${receiverForm.receiver_city.replace(/'/g, "''")}',
            receiver_state = '${receiverForm.receiver_state.replace(/'/g, "''")}',
            receiver_zip = '${receiverForm.receiver_zip.replace(/'/g, "''")}',
            receiver_phone = '${receiverForm.receiver_phone.replace(/'/g, "''")}'
          WHERE id = '${editingReceiver.id}'
        `;
        
        const { error } = await supabase.rpc('exec_sql', { query: updateQuery });
        if (error) throw error;
        
        toast({
          title: "Receiver updated",
          description: "Receiver has been updated successfully."
        });
      } else {
        const insertQuery = `
          INSERT INTO receivers (receiver_name, receiver_mailing_address, receiver_city, receiver_state, receiver_zip, receiver_phone, is_active)
          VALUES (
            '${receiverForm.receiver_name.replace(/'/g, "''")}',
            '${receiverForm.receiver_mailing_address.replace(/'/g, "''")}',
            '${receiverForm.receiver_city.replace(/'/g, "''")}',
            '${receiverForm.receiver_state.replace(/'/g, "''")}',
            '${receiverForm.receiver_zip.replace(/'/g, "''")}',
            '${receiverForm.receiver_phone.replace(/'/g, "''")}',
            true
          )
        `;
        
        const { error } = await supabase.rpc('exec_sql', { query: insertQuery });
        if (error) throw error;
        
        toast({
          title: "Receiver created",
          description: "New receiver has been created successfully."
        });
      }

      setReceiverDialogOpen(false);
      resetReceiverForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving receiver:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save receiver.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleHaulerStatus = async (hauler: Hauler) => {
    try {
      const query = `UPDATE haulers SET is_active = ${!hauler.is_active} WHERE id = '${hauler.id}'`;
      const { error } = await supabase.rpc('exec_sql', { query });
      
      if (error) throw error;
      
      toast({
        title: `Hauler ${hauler.is_active ? 'deactivated' : 'activated'}`,
        description: `${hauler.hauler_name} has been ${hauler.is_active ? 'deactivated' : 'activated'}.`
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error toggling hauler status:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update hauler status.",
        variant: "destructive"
      });
    }
  };

  const toggleReceiverStatus = async (receiver: Receiver) => {
    try {
      const query = `UPDATE receivers SET is_active = ${!receiver.is_active} WHERE id = '${receiver.id}'`;
      const { error } = await supabase.rpc('exec_sql', { query });
      
      if (error) throw error;
      
      toast({
        title: `Receiver ${receiver.is_active ? 'deactivated' : 'activated'}`,
        description: `${receiver.receiver_name} has been ${receiver.is_active ? 'deactivated' : 'activated'}.`
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error toggling receiver status:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update receiver status.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">Manage haulers and receivers</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Haulers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Haulers</CardTitle>
                <Dialog open={haulerDialogOpen} onOpenChange={setHaulerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openHaulerDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hauler
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingHauler ? 'Edit Hauler' : 'Add New Hauler'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="hauler-name">Name *</Label>
                        <Input
                          id="hauler-name"
                          value={haulerForm.hauler_name}
                          onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_name: e.target.value }))}
                          placeholder="Hauler name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hauler-address">Mailing Address</Label>
                        <Input
                          id="hauler-address"
                          value={haulerForm.hauler_mailing_address}
                          onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_mailing_address: e.target.value }))}
                          placeholder="Mailing address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="hauler-city">City</Label>
                          <Input
                            id="hauler-city"
                            value={haulerForm.hauler_city}
                            onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_city: e.target.value }))}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hauler-state">State</Label>
                          <Input
                            id="hauler-state"
                            value={haulerForm.hauler_state}
                            onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="hauler-zip">ZIP</Label>
                          <Input
                            id="hauler-zip"
                            value={haulerForm.hauler_zip}
                            onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_zip: e.target.value }))}
                            placeholder="ZIP code"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hauler-phone">Phone</Label>
                          <Input
                            id="hauler-phone"
                            value={haulerForm.hauler_phone}
                            onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_phone: e.target.value }))}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="hauler-mi-reg">MI Registration</Label>
                        <Input
                          id="hauler-mi-reg"
                          value={haulerForm.hauler_mi_reg}
                          onChange={(e) => setHaulerForm(prev => ({ ...prev, hauler_mi_reg: e.target.value }))}
                          placeholder="MI registration number"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setHaulerDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveHauler} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingHauler ? 'Update' : 'Create'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {haulers.map((hauler) => (
                  <div key={hauler.id} className="flex justify-between items-start p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{hauler.hauler_name}</span>
                        <Badge variant={hauler.is_active ? "default" : "secondary"}>
                          {hauler.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {hauler.hauler_city && (
                        <div className="text-sm text-muted-foreground">
                          {hauler.hauler_city}, {hauler.hauler_state}
                        </div>
                      )}
                      {hauler.hauler_mi_reg && (
                        <div className="text-sm text-muted-foreground">
                          MI Reg: {hauler.hauler_mi_reg}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openHaulerDialog(hauler)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={hauler.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleHaulerStatus(hauler)}
                      >
                        {hauler.is_active ? <Trash2 className="h-3 w-3" /> : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
                {haulers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No haulers found. Add your first hauler to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receivers */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Receivers</CardTitle>
                <Dialog open={receiverDialogOpen} onOpenChange={setReceiverDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openReceiverDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Receiver
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingReceiver ? 'Edit Receiver' : 'Add New Receiver'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="receiver-name">Name *</Label>
                        <Input
                          id="receiver-name"
                          value={receiverForm.receiver_name}
                          onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_name: e.target.value }))}
                          placeholder="Receiver name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="receiver-address">Mailing Address</Label>
                        <Input
                          id="receiver-address"
                          value={receiverForm.receiver_mailing_address}
                          onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_mailing_address: e.target.value }))}
                          placeholder="Mailing address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="receiver-city">City</Label>
                          <Input
                            id="receiver-city"
                            value={receiverForm.receiver_city}
                            onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_city: e.target.value }))}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="receiver-state">State</Label>
                          <Input
                            id="receiver-state"
                            value={receiverForm.receiver_state}
                            onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="receiver-zip">ZIP</Label>
                          <Input
                            id="receiver-zip"
                            value={receiverForm.receiver_zip}
                            onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_zip: e.target.value }))}
                            placeholder="ZIP code"
                          />
                        </div>
                        <div>
                          <Label htmlFor="receiver-phone">Phone</Label>
                          <Input
                            id="receiver-phone"
                            value={receiverForm.receiver_phone}
                            onChange={(e) => setReceiverForm(prev => ({ ...prev, receiver_phone: e.target.value }))}
                            placeholder="Phone number"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setReceiverDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveReceiver} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingReceiver ? 'Update' : 'Create'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receivers.map((receiver) => (
                  <div key={receiver.id} className="flex justify-between items-start p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{receiver.receiver_name}</span>
                        <Badge variant={receiver.is_active ? "default" : "secondary"}>
                          {receiver.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {receiver.receiver_city && (
                        <div className="text-sm text-muted-foreground">
                          {receiver.receiver_city}, {receiver.receiver_state}
                        </div>
                      )}
                      {receiver.receiver_phone && (
                        <div className="text-sm text-muted-foreground">
                          Phone: {receiver.receiver_phone}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceiverDialog(receiver)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={receiver.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleReceiverStatus(receiver)}
                      >
                        {receiver.is_active ? <Trash2 className="h-3 w-3" /> : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
                {receivers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No receivers found. Add your first receiver to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}