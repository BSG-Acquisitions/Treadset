import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdateAssignmentStatus } from "@/hooks/useDriverWorkflow";
import { Upload, Camera } from "lucide-react";

const completeAssignmentSchema = z.object({
  actualPteCount: z.number().min(0, "PTE count must be 0 or greater"),
  actualOtrCount: z.number().min(0, "OTR count must be 0 or greater"),
  actualTractorCount: z.number().min(0, "Tractor count must be 0 or greater"),
  manifestUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CompleteAssignmentData = z.infer<typeof completeAssignmentSchema>;

interface CompleteAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: any;
}

export function CompleteAssignmentDialog({ 
  open, 
  onOpenChange, 
  assignment 
}: CompleteAssignmentDialogProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const updateStatus = useUpdateAssignmentStatus();

  const form = useForm<CompleteAssignmentData>({
    resolver: zodResolver(completeAssignmentSchema),
    defaultValues: {
      actualPteCount: assignment?.pickup?.pte_count || 0,
      actualOtrCount: assignment?.pickup?.otr_count || 0,
      actualTractorCount: assignment?.pickup?.tractor_count || 0,
      manifestUrl: "",
      notes: "",
    },
  });

  const handleSubmit = async (data: CompleteAssignmentData) => {
    try {
      await updateStatus.mutateAsync({
        assignmentId: assignment.id,
        status: 'completed',
        completionData: {
          actualCounts: {
            pte: data.actualPteCount,
            otr: data.actualOtrCount,
            tractor: data.actualTractorCount,
          },
          manifestUrl: data.manifestUrl || null,
          notes: data.notes || null,
          photos: photos.length > 0 ? photos : null,
        }
      });
      onOpenChange(false);
      form.reset();
      setPhotos([]);
    } catch (error) {
      console.error('Error completing assignment:', error);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Pickup</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium">Final Counts</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="actualPteCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">PTE</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualOtrCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">OTR</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualTractorCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tractor</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="manifestUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manifest URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Photos (Optional)</label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Photos
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any issues, observations, or additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStatus.isPending}>
                {updateStatus.isPending ? "Completing..." : "Complete Pickup"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}