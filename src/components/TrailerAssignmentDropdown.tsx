import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";
import { useTrailers, Trailer } from "@/hooks/useTrailers";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface TrailerAssignmentDropdownProps {
  vehicleId: string;
  routeDate: string;
  currentTrailerId?: string | null;
  onTrailerAssigned?: (trailerId: string | null) => void;
}

export const TrailerAssignmentDropdown: React.FC<TrailerAssignmentDropdownProps> = ({
  vehicleId,
  routeDate,
  currentTrailerId,
  onTrailerAssigned
}) => {
  const { data: trailers = [] } = useTrailers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentTrailer = trailers.find(t => t.id === currentTrailerId);

  const assignTrailerMutation = useMutation({
    mutationFn: async (trailerId: string | null) => {
      const { data, error } = await supabase
        .from('assignments')
        .update({ trailer_id: trailerId })
        .eq('vehicle_id', vehicleId)
        .eq('scheduled_date', routeDate)
        .select();

      if (error) throw error;
      return trailerId;
    },
    onSuccess: (trailerId) => {
      const trailerName = trailerId
        ? trailers.find(t => t.id === trailerId)?.trailer_number || 'Trailer'
        : 'None';
      toast({
        title: "Trailer Assignment Updated",
        description: trailerId ? `Assigned trailer ${trailerName}` : 'Trailer unassigned',
      });
      onTrailerAssigned?.(trailerId);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['driver-weekly-assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign trailer",
        variant: "destructive"
      });
    }
  });

  const handleTrailerChange = (trailerId: string) => {
    assignTrailerMutation.mutate(trailerId === "none" ? null : trailerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'empty': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      case 'full': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
      case 'staged': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
      default: return '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Trailer:</span>
      </div>

      {currentTrailer ? (
        <Badge className={`flex items-center gap-1 ${getStatusColor(currentTrailer.current_status)}`}>
          #{currentTrailer.trailer_number}
          {currentTrailer.current_location && (
            <span className="text-xs opacity-75">• {currentTrailer.current_location}</span>
          )}
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1">
          No Trailer
        </Badge>
      )}

      <Select
        value={currentTrailerId || "none"}
        onValueChange={handleTrailerChange}
        disabled={assignTrailerMutation.isPending}
      >
        <SelectTrigger className="w-48 bg-background border-border hover:bg-accent/50 z-50">
          <SelectValue placeholder="Assign Trailer" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-lg z-50">
          <SelectItem value="none" className="hover:bg-accent/50">
            <span>No Trailer</span>
          </SelectItem>
          {trailers.map((trailer) => (
            <SelectItem key={trailer.id} value={trailer.id} className="hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <div>
                  <div className="font-medium">#{trailer.trailer_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {trailer.current_status}{trailer.current_location ? ` • ${trailer.current_location}` : ''}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assignTrailerMutation.isPending && (
        <div className="text-sm text-muted-foreground">Updating...</div>
      )}
    </div>
  );
};
