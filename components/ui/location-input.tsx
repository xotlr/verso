'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Major film production cities
const CITIES = [
  'Los Angeles, CA',
  'New York, NY',
  'Atlanta, GA',
  'Vancouver, BC',
  'London, UK',
  'Toronto, ON',
  'Chicago, IL',
  'Austin, TX',
  'New Orleans, LA',
  'Miami, FL',
  'San Francisco, CA',
  'Seattle, WA',
  'Portland, OR',
  'Nashville, TN',
  'Detroit, MI',
  'Philadelphia, PA',
  'Boston, MA',
  'Denver, CO',
  'Phoenix, AZ',
  'Las Vegas, NV',
  'Sydney, Australia',
  'Melbourne, Australia',
  'Berlin, Germany',
  'Paris, France',
  'Mumbai, India',
  'Seoul, South Korea',
  'Tokyo, Japan',
  'Remote',
];

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder = 'Location (e.g., Los Angeles, CA)',
  className,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get user's location from IP (no permission needed)
  useEffect(() => {
    const fetchLocation = async () => {
      setLoadingLocation(true);
      try {
        const response = await fetch('http://ip-api.com/json/');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.city) {
            const locationStr = data.regionName
              ? `${data.city}, ${data.regionName}`
              : data.country
                ? `${data.city}, ${data.country}`
                : data.city;
            setCurrentLocation(locationStr);
          }
        }
      } catch (error) {
        console.error('Failed to get location from IP:', error);
      } finally {
        setLoadingLocation(false);
      }
    };
    fetchLocation();
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    if (value.trim()) {
      const filtered = CITIES.filter((city) =>
        city.toLowerCase().includes(value.toLowerCase())
      );
      // Add current location at the top if it matches
      const allSuggestions = currentLocation &&
        currentLocation.toLowerCase().includes(value.toLowerCase()) &&
        !filtered.includes(currentLocation)
          ? [currentLocation, ...filtered]
          : filtered;
      setSuggestions(allSuggestions.slice(0, 8));
      setShowSuggestions(allSuggestions.length > 0);
      setSelectedIndex(0);
    } else {
      // Show current location + top cities when empty (shown on focus)
      const topSuggestions = currentLocation
        ? [currentLocation, ...CITIES.slice(0, 5)]
        : CITIES.slice(0, 6);
      setSuggestions(topSuggestions);
      // Don't auto-hide - let onFocus show them
      setSelectedIndex(0);
    }
  }, [value, currentLocation]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        onChange(suggestions[selectedIndex]);
        setShowSuggestions(false);
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={suggestionsRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Always show suggestions on focus
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="pr-8"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {loadingLocation ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[240px] overflow-auto">
          {suggestions.map((location, index) => {
            const isSelected = index === selectedIndex;
            const isCurrentLocation = location === currentLocation;
            return (
              <button
                key={location}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left text-sm',
                  isSelected ? 'bg-accent' : 'hover:bg-muted'
                )}
                onClick={() => {
                  onChange(location);
                  setShowSuggestions(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {isCurrentLocation ? (
                  <Navigation className="h-4 w-4 text-primary" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={isCurrentLocation ? 'text-primary' : ''}>
                  {location}
                </span>
                {isCurrentLocation && (
                  <span className="text-xs text-muted-foreground ml-auto">Current</span>
                )}
                {isSelected && !isCurrentLocation && (
                  <span className="ml-auto text-xs text-muted-foreground">↵</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
