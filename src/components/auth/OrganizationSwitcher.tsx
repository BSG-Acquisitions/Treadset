import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building, ChevronDown, Check } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export const OrganizationSwitcher: React.FC = () => {
  const { user, switchOrganization, getCurrentOrgSlug } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('user_organization_roles')
          .select(`
            organization:organizations (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching organizations:', error);
          return;
        }

        const orgs = data
          .map((item: any) => item.organization)
          .filter(Boolean)
          .reduce((unique: Organization[], org: Organization) => {
            return unique.find(u => u.id === org.id) ? unique : [...unique, org];
          }, []);

        setOrganizations(orgs);
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrganizations();
  }, [user]);

  // Don't show switcher if user has no organizations or only one
  if (!user || loading || organizations.length <= 1) {
    return null;
  }

  const currentOrgSlug = getCurrentOrgSlug();
  const currentOrg = organizations.find(org => org.slug === currentOrgSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Building className="h-4 w-4 mr-2" />
          <span className="max-w-[120px] truncate">
            {currentOrg?.name || 'Select Org'}
          </span>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.slug)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2" />
              <span className="truncate">{org.name}</span>
            </div>
            {org.slug === currentOrgSlug && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};