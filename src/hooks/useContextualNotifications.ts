import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedNotifications } from './useEnhancedNotifications';
import { useAuth } from '@/contexts/AuthContext';

export const useContextualNotifications = () => {
  const { createNotification } = useEnhancedNotifications();
  const { user } = useAuth();

  // Check for incomplete manifests
  useQuery({
    queryKey: ['incomplete-manifests-check'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, user_organization_roles(organization_id)')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const orgId = userData.user_organization_roles[0]?.organization_id;
      if (!orgId) return null;

      const { data: manifests } = await supabase
        .from('manifests')
        .select('id, manifest_number, client_id, clients(company_name)')
        .eq('organization_id', orgId)
        .eq('status', 'DRAFT')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (manifests && manifests.length > 0) {
        for (const manifest of manifests) {
          // Check for existing notification before creating
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userData.id)
            .eq('related_type', 'manifest')
            .eq('related_id', manifest.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          createNotification({
            user_id: userData.id,
            organization_id: orgId,
            title: 'Incomplete Manifest',
            message: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name} has been incomplete for over 24 hours`,
            type: 'warning',
            priority: 'medium',
            action_link: `/manifests`,
            role_visibility: ['admin', 'ops_manager', 'dispatcher'],
            related_type: 'manifest',
            related_id: manifest.id,
          });
        }
      }

      return manifests;
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 60, // Check every hour
  });

  // Check for clients with missing critical data
  useQuery({
    queryKey: ['missing-client-data-check'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, user_organization_roles(organization_id)')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const orgId = userData.user_organization_roles[0]?.organization_id;
      if (!orgId) return null;

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, email, phone, physical_address')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .or('email.is.null,phone.is.null,physical_address.is.null');

      if (clients && clients.length > 0) {
        for (const client of clients.slice(0, 5)) {
          // Check for existing notification before creating
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userData.id)
            .eq('related_type', 'client')
            .eq('related_id', client.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          const missingFields = [];
          if (!client.email) missingFields.push('email');
          if (!client.phone) missingFields.push('phone');
          if (!client.physical_address) missingFields.push('address');

          createNotification({
            user_id: userData.id,
            organization_id: orgId,
            title: 'Missing Client Data',
            message: `${client.company_name} is missing: ${missingFields.join(', ')}`,
            type: 'info',
            priority: 'low',
            action_link: `/clients/${client.id}`,
            role_visibility: ['admin', 'ops_manager', 'sales'],
            related_type: 'client',
            related_id: client.id,
          });
        }
      }

      return clients;
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 60 * 24, // Check daily
  });

  // Check for upcoming pickups without driver assignment
  useQuery({
    queryKey: ['unassigned-pickups-check'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, user_organization_roles(organization_id)')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const orgId = userData.user_organization_roles[0]?.organization_id;
      if (!orgId) return null;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const { data: pickups } = await supabase
        .from('pickups')
        .select(`
          id,
          pickup_date,
          clients(company_name),
          assignments!left(id, driver_id)
        `)
        .eq('status', 'scheduled')
        .lte('pickup_date', tomorrow.toISOString().split('T')[0])
        .is('assignments.driver_id', null);

      if (pickups && pickups.length > 0) {
        for (const pickup of pickups.slice(0, 10)) {
          // Check for existing notification before creating
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userData.id)
            .eq('related_type', 'pickup')
            .eq('related_id', pickup.id)
            .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existing && existing.length > 0) continue;

          createNotification({
            user_id: userData.id,
            organization_id: orgId,
            title: 'Unassigned Pickup',
            message: `Pickup for ${pickup.clients?.company_name} on ${pickup.pickup_date} needs driver assignment`,
            type: 'warning',
            priority: 'high',
            action_link: `/routes/today`,
            role_visibility: ['admin', 'ops_manager', 'dispatcher'],
            related_type: 'pickup',
            related_id: pickup.id,
          });
        }
      }

      return pickups;
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 30, // Check every 30 minutes
  });

  return {
    // Contextual checks run automatically in background
  };
};
