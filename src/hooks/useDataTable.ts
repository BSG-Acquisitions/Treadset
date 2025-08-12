import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
}

export interface UseDataTableOptions {
  defaultPageSize?: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  urlStateKey?: string;
}

export function useDataTable({
  defaultPageSize = 10,
  defaultSortBy = 'created_at',
  defaultSortOrder = 'desc',
  urlStateKey = 'table'
}: UseDataTableOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const getInitialState = useCallback((): TableState => {
    const urlState = searchParams.get(urlStateKey);
    if (urlState) {
      try {
        const parsed = JSON.parse(decodeURIComponent(urlState));
        return {
          page: parsed.page || 1,
          pageSize: parsed.pageSize || defaultPageSize,
          search: parsed.search || '',
          sortBy: parsed.sortBy || defaultSortBy,
          sortOrder: parsed.sortOrder || defaultSortOrder,
          filters: parsed.filters || {}
        };
      } catch {
        // Fall through to default state
      }
    }
    
    return {
      page: 1,
      pageSize: defaultPageSize,
      search: '',
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      filters: {}
    };
  }, [searchParams, urlStateKey, defaultPageSize, defaultSortBy, defaultSortOrder]);

  const [state, setState] = useState<TableState>(getInitialState);

  // Update URL when state changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set(urlStateKey, encodeURIComponent(JSON.stringify(state)));
    setSearchParams(newSearchParams, { replace: true });
  }, [state, searchParams, setSearchParams, urlStateKey]);

  const updateState = useCallback((updates: Partial<TableState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Reset to page 1 when search or filters change
      if (updates.search !== undefined || updates.filters !== undefined) {
        newState.page = 1;
      }
      return newState;
    });
  }, []);

  const setPage = useCallback((page: number) => {
    updateState({ page });
  }, [updateState]);

  const setPageSize = useCallback((pageSize: number) => {
    updateState({ pageSize, page: 1 });
  }, [updateState]);

  const setSearch = useCallback((search: string) => {
    updateState({ search });
  }, [updateState]);

  const setSort = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    updateState({ 
      sortBy, 
      sortOrder: sortOrder || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc')
    });
  }, [updateState, state.sortBy, state.sortOrder]);

  const setFilters = useCallback((filters: Record<string, any>) => {
    updateState({ filters });
  }, [updateState]);

  const setFilter = useCallback((key: string, value: any) => {
    updateState({ 
      filters: { 
        ...state.filters, 
        [key]: value 
      }
    });
  }, [updateState, state.filters]);

  const clearFilters = useCallback(() => {
    updateState({ filters: {} });
  }, [updateState]);

  const reset = useCallback(() => {
    setState({
      page: 1,
      pageSize: defaultPageSize,
      search: '',
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
      filters: {}
    });
  }, [defaultPageSize, defaultSortBy, defaultSortOrder]);

  return {
    state,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilters,
    setFilter,
    clearFilters,
    reset,
    updateState
  };
}