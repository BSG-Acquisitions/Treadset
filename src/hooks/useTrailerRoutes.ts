import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TrailerRouteStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface TrailerRoute {
  id: string;
  organization_id: string;
  route_name: string;
  scheduled_date: string;
  driver_id: string | null;
  vehicle_id: string | null;
  status: TrailerRouteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  vehicle?: {
    id: string;
    vehicle_number: string;
  };
  stops?: TrailerRouteStop[];
}

export interface TrailerRouteStop {
  id: string;
  route_id: string;
  location_id: string | null;
  location_name: string | null;
  location_address: string | null;
  sequence_number: number;
  contact_name: string | null;
  contact_phone: string | null;
  instructions: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useTrailerRoutes = (date?: string) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-routes', orgId, date],
    queryFn: async () => {
      if (!orgId) return [];
      
      let query = supabase
        .from('trailer_routes')
        .select(`
          *,
          driver:users(id, first_name, last_name, email),
          vehicle:trailer_vehicles(id, vehicle_number),
          stops:trailer_route_stops(*)
        `)
        .eq('organization_id', orgId)
        .order('scheduled_date', { ascending: true });
      
      if (date) {
        query = query.eq('scheduled_date', date);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TrailerRoute[];
    },
    enabled: !!orgId,
  });
};

export const useDriverTrailerRoutes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['driver-trailer-routes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get the internal user id
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!userData) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('trailer_routes')
        .select(`
          *,
          vehicle:trailer_vehicles(id, vehicle_number),
          stops:trailer_route_stops(*)
        `)
        .eq('driver_id', userData.id)
        .gte('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data as TrailerRoute[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateTrailerRoute = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: {
      route_name: string;
      scheduled_date: string;
      driver_id?: string;
      vehicle_id?: string;
      notes?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data: route, error } = await supabase
        .from('trailer_routes')
        .insert({
          organization_id: orgId,
          route_name: data.route_name,
          scheduled_date: data.scheduled_date,
          driver_id: data.driver_id,
          vehicle_id: data.vehicle_id,
          notes: data.notes,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Trailer route created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });
};

export const useUpdateTrailerRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TrailerRoute> & { id: string }) => {
      const { error } = await supabase
        .from('trailer_routes')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Route updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });
};

export const useAddRouteStop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      route_id: string;
      location_name: string;
      location_address?: string;
      location_id?: string;
      sequence_number: number;
      contact_name?: string;
      contact_phone?: string;
      instructions?: string;
    }) => {
      const { data: stop, error } = await supabase
        .from('trailer_route_stops')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return stop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Stop added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add stop: ${error.message}`);
    },
  });
};

export const useDeleteRouteStop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stopId: string) => {
      const { error } = await supabase
        .from('trailer_route_stops')
        .delete()
        .eq('id', stopId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-routes'] });
      toast.success('Stop removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove stop: ${error.message}`);
    },
  });
};
