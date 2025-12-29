import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Employee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  organizationId: string;
  signatureDataUrl?: string;
}

export interface CreateEmployeeData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
}

export interface UpdateEmployeeData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: string[];
  isActive?: boolean;
}

export const useEmployees = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['employees', user?.currentOrganization?.id],
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
          created_at,
          signature_data_url,
          user_organization_roles!inner(
            role,
            organization_id
          )
        `)
        .eq('user_organization_roles.organization_id', user.currentOrganization.id)
        .in('user_organization_roles.role', ['admin', 'ops_manager', 'dispatcher', 'driver', 'sales']);

      if (error) throw error;

      return data?.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        isActive: user.is_active,
        createdAt: user.created_at,
        roles: user.user_organization_roles.map(r => r.role),
        organizationId: user.user_organization_roles[0]?.organization_id,
        signatureDataUrl: user.signature_data_url
      } as Employee)) || [];
    },
    enabled: !!user?.currentOrganization?.id
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (employeeData: CreateEmployeeData) => {
      if (!user?.currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      console.log('Calling create-employee function with data:', JSON.stringify(employeeData, null, 2));
      console.log('Organization ID:', user.currentOrganization.id);

      // Call the edge function instead of using auth.admin directly
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          email: employeeData.email,
          password: employeeData.password,
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          phone: employeeData.phone,
          roles: employeeData.roles,
          organizationId: user.currentOrganization.id
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Employee creation error:', data.error);
        throw new Error(data.error);
      }

      console.log('Employee created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee created successfully. They can now log in with their credentials."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ employeeId, updates }: { employeeId: string; updates: UpdateEmployeeData }) => {
      if (!user?.currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Build update data
      const updateData: any = {
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone,
        is_active: updates.isActive
      };

      // Normalize email to lowercase if provided
      if (updates.email) {
        updateData.email = updates.email.toLowerCase().trim();
      }

      // Update user record in public.users
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', employeeId);

      if (userError) throw userError;

      // Update roles if provided
      if (updates.roles) {
        // First, delete existing roles for this user in this organization
        const { error: deleteError } = await supabase
          .from('user_organization_roles')
          .delete()
          .eq('user_id', employeeId)
          .eq('organization_id', user.currentOrganization.id);

        if (deleteError) throw deleteError;

        // Then insert new roles
        const roleInserts = updates.roles.map(role => ({
          user_id: employeeId,
          organization_id: user.currentOrganization.id,
          role: role as 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales'
        }));

        const { error: roleError } = await supabase
          .from('user_organization_roles')
          .insert(roleInserts);

        if (roleError) throw roleError;
      }

      return { employeeId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive"
      });
    }
  });
};

export const useDeactivateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', employeeId);

      if (error) throw error;
      return employeeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee deactivated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate employee",
        variant: "destructive"
      });
    }
  });
};