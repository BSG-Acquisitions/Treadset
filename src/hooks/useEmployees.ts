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
          user_organization_roles!inner(
            role,
            organization_id
          )
        `)
        .eq('user_organization_roles.organization_id', user.currentOrganization.id);

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
        organizationId: user.user_organization_roles[0]?.organization_id
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

      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: employeeData.email,
        password: employeeData.password,
        email_confirm: true,
        user_metadata: {
          first_name: employeeData.firstName,
          last_name: employeeData.lastName
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user record in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: employeeData.email,
          first_name: employeeData.firstName,
          last_name: employeeData.lastName,
          phone: employeeData.phone
        })
        .select()
        .single();

      if (userError) throw userError;

      // Assign roles to the user
      const roleInserts = employeeData.roles.map(role => ({
        user_id: userData.id,
        organization_id: user.currentOrganization.id,
        role: role as 'admin' | 'ops_manager' | 'dispatcher' | 'driver' | 'sales'
      }));

      const { error: roleError } = await supabase
        .from('user_organization_roles')
        .insert(roleInserts);

      if (roleError) throw roleError;

      return userData;
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

      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          is_active: updates.isActive
        })
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