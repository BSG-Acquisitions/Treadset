import { useState, useEffect, useCallback } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableDropdownProps<T> {
  placeholder: string;
  searchFunction: (search: string) => Promise<T[]>;
  onSelect: (item: T | null) => void;
  displayField: keyof T;
  className?: string;
  selected?: T | null;
}

export function SearchableDropdown<T extends Record<string, any>>({
  placeholder,
  searchFunction,
  onSelect,
  displayField,
  className,
  selected
}: SearchableDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadItems = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      const results = await searchFunction(searchTerm);
      setItems(results);
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchFunction]);

  useEffect(() => {
    if (open) {
      loadItems("");
    }
  }, [open, loadItems]);

  useEffect(() => {
    if (search) {
      const timeoutId = setTimeout(() => {
        loadItems(search);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [search, loadItems]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selected ? selected[displayField] : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading..." : "No items found."}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item, index) => (
                <CommandItem
                  key={index}
                  value={item[displayField]}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected && selected[displayField] === item[displayField] ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item[displayField]}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}