import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MAPBOX_TOKEN } from '../../config/mapbox';
import styles from './AddressSearch.module.css';

/**
 * Mapbox Geocoding API response types
 * Based on https://docs.mapbox.com/api/search/geocoding/
 */
interface MapboxFeature {
  id: string;
  type: 'Feature';
  place_type: string[];
  relevance: number;
  properties: {
    accuracy?: string;
    [key: string]: unknown;
  };
  text: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

interface MapboxGeocodingResponse {
  type: 'FeatureCollection';
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface AddressSearchProps {
  onLocationSelect: (longitude: number, latitude: number, placeName: string) => void;
  onGeolocationRequest?: () => void;
  className?: string;
}

/**
 * AddressSearch component provides fast, debounced address search with autocomplete
 * using the Mapbox Geocoding API.
 *
 * Features:
 * - Debounced API calls (300ms) for performance
 * - Keyboard navigation (Arrow up/down, Enter, Escape)
 * - ARIA accessibility attributes
 * - Cached recent queries to reduce API calls
 * - Click-outside to close dropdown
 * - Extensible for future coordinate/MGRS input
 */
export const AddressSearch: React.FC<AddressSearchProps> = ({
  onLocationSelect,
  onGeolocationRequest,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Simple in-memory cache for recent queries
  const cacheRef = useRef<Map<string, MapboxFeature[]>>(new Map());

  /**
   * Fetch geocoding results from Mapbox API
   */
  const fetchGeocodingResults = useCallback(async (searchQuery: string) => {
    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not configured');
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(searchQuery.toLowerCase());
    if (cached) {
      setResults(cached);
      setIsOpen(true);
      setIsLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const encodedQuery = encodeURIComponent(searchQuery);
      // Using forward geocoding API with address and place types
      // Limit to 5 results for cleaner UI
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&types=address,place,locality,neighborhood,postcode&limit=5&autocomplete=true`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data: MapboxGeocodingResponse = await response.json();

      // Cache the results
      cacheRef.current.set(searchQuery.toLowerCase(), data.features);

      // Limit cache size to 20 most recent queries
      if (cacheRef.current.size > 20) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }

      setResults(data.features);
      setIsOpen(data.features.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Geocoding error:', err);
        setError('Search failed. Please try again.');
        setResults([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Close dropdown if query is empty
      if (!value.trim()) {
        setIsOpen(false);
        setResults([]);
        setError(null);
        return;
      }

      // Debounce API call by 300ms
      debounceTimerRef.current = setTimeout(() => {
        fetchGeocodingResults(value.trim());
      }, 300);
    },
    [fetchGeocodingResults]
  );

  /**
   * Handle result selection
   */
  const handleSelectResult = useCallback(
    (feature: MapboxFeature) => {
      const [lng, lat] = feature.center;
      setQuery(feature.place_name);
      setIsOpen(false);
      setSelectedIndex(-1);
      onLocationSelect(lng, lat, feature.place_name);
    },
    [onLocationSelect]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) {
        // If Enter pressed with no dropdown, try to geocode the query directly
        if (e.key === 'Enter' && query.trim()) {
          fetchGeocodingResults(query.trim());
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, -1));
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;

        default:
          break;
      }
    },
    [isOpen, results, selectedIndex, query, handleSelectResult, fetchGeocodingResults]
  );

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Cleanup debounce timer and abort controller on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.searchBox}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for address or location..."
          className={styles.input}
          aria-label="Search for address or location"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
          aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
        />

        {isLoading && (
          <div className={styles.loadingSpinner} aria-label="Loading results">
            ⏳
          </div>
        )}

        {onGeolocationRequest && (
          <button
            type="button"
            onClick={onGeolocationRequest}
            className={styles.geolocateButton}
            title="Use my location"
            aria-label="Use my location"
          >
            📍
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div ref={dropdownRef} id="search-results" className={styles.dropdown} role="listbox">
          {results.map((feature, index) => (
            <button
              key={feature.id}
              id={`result-${index}`}
              type="button"
              className={`${styles.result} ${index === selectedIndex ? styles.resultSelected : ''}`}
              onClick={() => handleSelectResult(feature)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className={styles.resultText}>{feature.text}</div>
              <div className={styles.resultContext}>{feature.place_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
