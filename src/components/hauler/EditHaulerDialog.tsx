import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HaulerForm } from "@/components/forms/HaulerForm";
import { useUpdateHauler, Hauler } from "@/hooks/useHaulers";

interface EditHaulerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hauler: Hauler | null;
}

export function EditHaulerDialog({ open, onOpenChange, hauler }: EditHaulerDialogProps) {
  const updateHauler = useUpdateHauler();

  const handleSubmit = async (data: any) => {
    if (!hauler) return;

    await updateHauler.mutateAsync({
      id: hauler.id,
      data: {
        hauler_name: data.company_name,
        hauler_mailing_address: data.mailing_address,
        hauler_city: data.city,
        hauler_state: data.state,
        hauler_zip: data.zip,
        hauler_phone: data.phone,
        hauler_mi_reg: data.michigan_registration,
        email: data.email,
      },
    });

    onOpenChange(false);
  };

  if (!hauler) return null;

  const initialData = {
    company_name: hauler.company_name || hauler.hauler_name || "",
    mailing_address: hauler.mailing_address || hauler.hauler_mailing_address || "",
    city: hauler.city || hauler.hauler_city || "",
    state: hauler.state || hauler.hauler_state || "",
    zip: hauler.zip || hauler.hauler_zip || "",
    phone: hauler.phone || hauler.hauler_phone || "",
    email: hauler.email || "",
    hauler_mi_reg: hauler.hauler_mi_reg || "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Hauler</DialogTitle>
        </DialogHeader>
        <HaulerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={updateHauler.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
