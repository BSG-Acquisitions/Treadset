import { useState } from "react";
import { useTrailers } from "@/hooks/useTrailers";
import { useCreateTrailerEvent, EVENT_TYPE_LABELS, TrailerEventType } from "@/hooks/useTrailerEvents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Truck, MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const EXTERNAL_EVENT_TYPES: TrailerEventType[] = [
  'external_pickup',
  'external_drop',
  'stage_empty',
  'waiting_unload',
];

export default function TrailerExternalMoves() {
  const { data: trailers } = useTrailers();
  const createEvent = useCreateTrailerEvent();
  
  const [formData, setFormData] = useState({
    trailer_id: '',
    event_type: '' as TrailerEventType | '',
    location_name: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trailer_id || !formData.event_type || !formData.location_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    await createEvent.mutateAsync({
      trailer_id: formData.trailer_id,
      event_type: formData.event_type,
      location_name: formData.location_name,
      notes: formData.notes || undefined,
    });
    
    setFormData({
      trailer_id: '',
      event_type: '',
      location_name: '',
      notes: '',
    });
  };

  const selectedTrailer = trailers?.find(t => t.id === formData.trailer_id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Log External Trailer Move</h1>
        <p className="text-muted-foreground">
          Record trailer movements that occur outside of scheduled routes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            External Move Entry
          </CardTitle>
          <CardDescription>
            Use this form to log trailer movements by third parties or unscheduled internal moves
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="trailer">Select Trailer *</Label>
              <Select
                value={formData.trailer_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, trailer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trailer..." />
                </SelectTrigger>
                <SelectContent>
                  {trailers?.map(trailer => (
                    <SelectItem key={trailer.id} value={trailer.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {trailer.trailer_number}
                        <span className="text-muted-foreground">
                          ({trailer.current_status})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTrailer && (
                <div className="mt-2 p-2 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">Current location: </span>
                  <span className="font-medium">
                    {selectedTrailer.current_location || 'Unknown'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value as TrailerEventType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type..." />
                </SelectTrigger>
                <SelectContent>
                  {EXTERNAL_EVENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">New Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                  placeholder="Enter location name or address"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details about this move..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-yellow-800">
                <strong>Note:</strong> This will update the trailer's current status and location in the system.
                Make sure the information is accurate.
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? 'Recording...' : 'Record External Move'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
