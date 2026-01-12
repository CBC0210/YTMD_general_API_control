import { useState, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { parseSearchResponse } from "../features/search/searchService";
import type { Song } from "../types";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      searchAbortRef.current?.abort();
      return;
    }
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    try {
      const data = await api.search(query);
      if (!ctrl.signal.aborted && data) {
        console.log('Raw search data:', data);
        const mapped = parseSearchResponse(data);
        console.log('Parsed search results:', mapped);
        setSearchResults(mapped);
      } else if (!ctrl.signal.aborted) {
        console.log('No search data received');
        setSearchResults([]);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        console.error('Search error:', e);
        setSearchResults([]);
      }
    }
  }, []);

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort();
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    handleSearch,
    clearSearch,
  };
}

