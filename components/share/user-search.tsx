"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
}

interface UserSearchProps {
  onSelect: (user: SearchUser) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function UserSearch({ onSelect, excludeIds = [], placeholder = "Search by name or email..." }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const url = `/api/users/search?q=${encodeURIComponent(debouncedQuery)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Filter out excluded users
          const filtered = data.filter((u: SearchUser) => !excludeIds.includes(u.id));
          setResults(filtered);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery, excludeIds]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: SearchUser) => {
    onSelect(user);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
          {results.length === 0 && !isLoading && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              No users found. You can invite them by email.
            </div>
          )}

          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left",
                "hover:bg-accent transition-colors"
              )}
            >
              <ProfileAvatar
                userId={user.id}
                imageUrl={user.image}
                name={user.name || user.email || "User"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                  {user.username && ` (@${user.username})`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
