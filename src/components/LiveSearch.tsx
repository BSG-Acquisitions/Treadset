import { useState, useEffect, useRef } from 'react';
import { Search, Building2, User, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: 'client' | 'location' | 'pickup';
  title: string;
  subtitle?: string;
  badge?: string;
  path: string;
}

export function LiveSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Use organization from user context directly
    const orgId = user?.currentOrganization?.id;
    if (!orgId) {
      console.warn('No organization ID available for search');
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const searchResults: SearchResult[] = [];

      // Search clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, email')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);

      if (clientsError) {
        console.error('Clients search error:', clientsError);
      } else if (clients) {
        clients.forEach(client => {
          searchResults.push({
            id: client.id,
            type: 'client',
            title: client.company_name,
            subtitle: client.contact_name || client.email || '',
            badge: 'Client',
            path: `/clients/${client.id}`
          });
        });
      }

      // Search locations
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select(`
          id,
          name,
          address,
          client:client_id(id, company_name)
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(5);

      if (locationsError) {
        console.error('Locations search error:', locationsError);
      } else if (locations) {
        locations.forEach(location => {
          searchResults.push({
            id: location.id,
            type: 'location',
            title: location.name || location.address,
            subtitle: location.client?.company_name || location.address,
            badge: 'Location',
            path: `/clients/${location.client?.id || '#'}`
          });
        });
      }

      // Search recent pickups
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          id,
          pickup_date,
          status,
          client:client_id(id, company_name),
          location:location_id(address)
        `)
        .eq('organization_id', orgId)
        .gte('pickup_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('pickup_date', { ascending: false })
        .limit(3);

      if (pickupsError) {
        console.error('Pickups search error:', pickupsError);
      } else if (pickups) {
        pickups.forEach(pickup => {
          if (pickup.client?.company_name.toLowerCase().includes(query.toLowerCase()) ||
              pickup.location?.address.toLowerCase().includes(query.toLowerCase())) {
            searchResults.push({
              id: pickup.id,
              type: 'pickup',
              title: `${pickup.client?.company_name} - ${pickup.pickup_date}`,
              subtitle: pickup.location?.address || '',
              badge: pickup.status || 'Pickup',
              path: `/routes/today`
            });
          }
        });
      }

      console.log(`[LIVE_SEARCH] Found ${searchResults.length} results for "${query}"`);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, user?.currentOrganization?.id]);

  const handleResultClick = () => {
    setIsOpen(false);
    setSearchQuery('');
    setResults([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Building2 className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'pickup':
        return <User className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen && (searchQuery.length > 0 || results.length > 0)} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search clients, locations, pickups..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10 bg-secondary/30 border-border/50 focus:bg-card focus:border-brand-primary/30 transition-all duration-300 text-sm"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[90vw] max-w-[400px] p-0 bg-card border-border shadow-lg z-50" 
        align="start"
        side="bottom"
        sideOffset={5}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={result.path}
                onClick={handleResultClick}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border/50 last:border-b-0 transition-colors"
              >
                <div className="text-muted-foreground">
                  {getResultIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-foreground truncate">
                      {result.title}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {result.badge}
                    </Badge>
                  </div>
                  {result.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : searchQuery.trim() && !isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results found for "{searchQuery}"
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}