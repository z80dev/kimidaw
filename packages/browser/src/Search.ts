/**
 * Search functionality for browser
 */

import type { SearchQuery, SearchResult, BrowserItem, SearchIndex } from './types.js';

export interface SearchManager {
  search(query: SearchQuery): SearchResult;
  searchByText(text: string): BrowserItem[];
  searchByTags(tags: string[]): BrowserItem[];
  searchByAuthor(author: string): BrowserItem[];
  addToIndex(item: BrowserItem): void;
  removeFromIndex(itemId: string): void;
  rebuildIndex(items: BrowserItem[]): void;
  getSuggestions(query: string): string[];
}

export function createSearchManager(): SearchManager {
  // Search index
  const index: SearchIndex = {
    items: new Map(),
    tags: new Map(),
    authors: new Map(),
  };

  // Full-text search words
  const wordIndex = new Map<string, Set<string>>();

  function addToIndex(item: BrowserItem): void {
    index.items.set(item.id, item);

    // Index tags
    for (const tag of item.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!index.tags.has(normalizedTag)) {
        index.tags.set(normalizedTag, new Set());
      }
      index.tags.get(normalizedTag)!.add(item.id);
    }

    // Index author
    if (item.author) {
      const normalizedAuthor = item.author.toLowerCase();
      if (!index.authors.has(normalizedAuthor)) {
        index.authors.set(normalizedAuthor, new Set());
      }
      index.authors.get(normalizedAuthor)!.add(item.id);
    }

    // Index words from name and description
    const words = extractWords(item.name + ' ' + (item.description || ''));
    for (const word of words) {
      if (!wordIndex.has(word)) {
        wordIndex.set(word, new Set());
      }
      wordIndex.get(word)!.add(item.id);
    }
  }

  function removeFromIndex(itemId: string): void {
    const item = index.items.get(itemId);
    if (!item) return;

    index.items.delete(itemId);

    // Remove from tag index
    for (const tag of item.tags) {
      const normalizedTag = tag.toLowerCase();
      index.tags.get(normalizedTag)?.delete(itemId);
    }

    // Remove from author index
    if (item.author) {
      const normalizedAuthor = item.author.toLowerCase();
      index.authors.get(normalizedAuthor)?.delete(itemId);
    }

    // Remove from word index
    const words = extractWords(item.name + ' ' + (item.description || ''));
    for (const word of words) {
      wordIndex.get(word)?.delete(itemId);
    }
  }

  function rebuildIndex(items: BrowserItem[]): void {
    // Clear existing index
    index.items.clear();
    index.tags.clear();
    index.authors.clear();
    wordIndex.clear();

    // Add all items
    for (const item of items) {
      addToIndex(item);
    }
  }

  function search(query: SearchQuery): SearchResult {
    let results: Set<string> = new Set();
    let isFirstFilter = true;

    // Text search
    if (query.text) {
      const textResults = searchByTextInternal(query.text);
      results = isFirstFilter ? textResults : intersect(results, textResults);
      isFirstFilter = false;
    }

    // Tag search
    if (query.tags && query.tags.length > 0) {
      const tagResults = searchByTagsInternal(query.tags);
      results = isFirstFilter ? tagResults : intersect(results, tagResults);
      isFirstFilter = false;
    }

    // Author search
    if (query.author) {
      const authorResults = searchByAuthorInternal(query.author);
      results = isFirstFilter ? authorResults : intersect(results, authorResults);
      isFirstFilter = false;
    }

    // Type filter
    if (query.type) {
      const typeResults = new Set<string>();
      for (const [id, item] of index.items) {
        if (item.type === query.type) {
          typeResults.add(id);
        }
      }
      results = isFirstFilter ? typeResults : intersect(results, typeResults);
      isFirstFilter = false;
    }

    // Date filters
    if (query.dateFrom || query.dateTo) {
      const dateResults = new Set<string>();
      for (const [id, item] of index.items) {
        if (query.dateFrom && item.modified < query.dateFrom) continue;
        if (query.dateTo && item.modified > query.dateTo) continue;
        dateResults.add(id);
      }
      results = isFirstFilter ? dateResults : intersect(results, dateResults);
      isFirstFilter = false;
    }

    // If no filters applied, return all items
    if (isFirstFilter) {
      results = new Set(index.items.keys());
    }

    // Convert to items
    const items = Array.from(results)
      .map(id => index.items.get(id))
      .filter((item): item is BrowserItem => item !== undefined);

    // Sort by relevance
    items.sort((a, b) => calculateRelevance(b, query) - calculateRelevance(a, query));

    return {
      items,
      totalCount: items.length,
      query,
    };
  }

  function searchByText(text: string): BrowserItem[] {
    const ids = searchByTextInternal(text);
    return Array.from(ids)
      .map(id => index.items.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  function searchByTags(tags: string[]): BrowserItem[] {
    const ids = searchByTagsInternal(tags);
    return Array.from(ids)
      .map(id => index.items.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  function searchByAuthor(author: string): BrowserItem[] {
    const ids = searchByAuthorInternal(author);
    return Array.from(ids)
      .map(id => index.items.get(id))
      .filter((item): item is BrowserItem => item !== undefined);
  }

  function searchByTextInternal(text: string): Set<string> {
    const words = extractWords(text);
    if (words.length === 0) return new Set();

    let results: Set<string> | null = null;

    for (const word of words) {
      const wordResults = wordIndex.get(word);
      if (!wordResults) {
        return new Set();
      }

      if (results === null) {
        results = new Set(wordResults);
      } else {
        results = intersect(results, wordResults);
      }
    }

    return results || new Set();
  }

  function searchByTagsInternal(tags: string[]): Set<string> {
    let results: Set<string> | null = null;

    for (const tag of tags) {
      const normalizedTag = tag.toLowerCase();
      const tagResults = index.tags.get(normalizedTag);
      
      if (!tagResults) {
        return new Set();
      }

      if (results === null) {
        results = new Set(tagResults);
      } else {
        results = intersect(results, tagResults);
      }
    }

    return results || new Set();
  }

  function searchByAuthorInternal(author: string): Set<string> {
    const normalizedAuthor = author.toLowerCase();
    return index.authors.get(normalizedAuthor) || new Set();
  }

  function getSuggestions(query: string): string[] {
    const normalizedQuery = query.toLowerCase();
    const suggestions: string[] = [];

    // Tag suggestions
    for (const tag of index.tags.keys()) {
      if (tag.includes(normalizedQuery)) {
        suggestions.push(tag);
      }
    }

    // Author suggestions
    for (const author of index.authors.keys()) {
      if (author.includes(normalizedQuery)) {
        suggestions.push(author);
      }
    }

    // Word suggestions
    for (const word of wordIndex.keys()) {
      if (word.includes(normalizedQuery)) {
        suggestions.push(word);
      }
    }

    return suggestions.slice(0, 10);
  }

  // Helper functions

  function extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  function intersect<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of set1) {
      if (set2.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  function calculateRelevance(item: BrowserItem, query: SearchQuery): number {
    let score = 0;
    const searchText = query.text.toLowerCase();
    const nameLower = item.name.toLowerCase();

    // Exact name match
    if (nameLower === searchText) {
      score += 100;
    }
    // Name starts with search
    else if (nameLower.startsWith(searchText)) {
      score += 50;
    }
    // Name contains search
    else if (nameLower.includes(searchText)) {
      score += 25;
    }

    // Favorites get boost
    if (item.isFavorite) {
      score += 10;
    }

    // Recent items get boost
    const daysSinceModified = (Date.now() - item.modified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) {
      score += 5;
    }

    return score;
  }

  return {
    search,
    searchByText,
    searchByTags,
    searchByAuthor,
    addToIndex,
    removeFromIndex,
    rebuildIndex,
    getSuggestions,
  };
}
