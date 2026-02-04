import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Driver {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
}

export const useDrivers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['drivers', user?.currentOrganization?.id],
    queryFn: async () => {
      if (!user?.currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          is_active,
          user_organization_roles!inner(
            role,
            organization_id
          )
        `)
        .eq('user_organization_roles.organization_id', user.currentOrganization.id)
        .eq('user_organization_roles.role', 'driver')
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        email: d.email,
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone,
        is_active: d.is_active,
      })) as Driver[];
    },
    enabled: !!user?.currentOrganization?.id,
  });
};
