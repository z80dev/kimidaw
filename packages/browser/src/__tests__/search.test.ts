import { describe, it, expect, beforeEach } from 'vitest';
import { createSearchManager, createCollectionsManager, createTagManager } from '../index.js';
import type { BrowserItem } from '../types.js';

function createTestItem(id: string, name: string, overrides: Partial<BrowserItem> = {}): BrowserItem {
  return {
    id,
    name,
    type: 'sample',
    category: 'samples',
    path: `/test/${id}`,
    tags: [],
    size: 1024,
    modified: new Date(),
    hasPreview: true,
    isFavorite: false,
    ...overrides,
  };
}

describe('SearchManager', () => {
  let search: ReturnType<typeof createSearchManager>;

  beforeEach(() => {
    search = createSearchManager();
  });

  it('should search by text', () => {
    const items = [
      createTestItem('1', 'Kick Drum 808'),
      createTestItem('2', 'Snare Drum Live'),
      createTestItem('3', 'Hi Hat Closed'),
    ];

    search.rebuildIndex(items);

    const results = search.searchByText('drum');
    expect(results.length).toBe(2);
  });

  it('should search by tags', () => {
    const items = [
      createTestItem('1', 'Kick', { tags: ['drum', '808'] }),
      createTestItem('2', 'Snare', { tags: ['drum', 'live'] }),
      createTestItem('3', 'Synth', { tags: ['bass'] }),
    ];

    search.rebuildIndex(items);

    const results = search.searchByTags(['drum']);
    expect(results.length).toBe(2);
  });

  it('should search by author', () => {
    const items = [
      createTestItem('1', 'Kick', { author: 'Ableton' }),
      createTestItem('2', 'Snare', { author: 'Ableton' }),
      createTestItem('3', 'HiHat', { author: 'User' }),
    ];

    search.rebuildIndex(items);

    const results = search.searchByAuthor('ableton');
    expect(results.length).toBe(2);
  });

  it('should perform combined search', () => {
    const items = [
      createTestItem('1', 'Kick 808', { tags: ['drum'], author: 'Ableton' }),
      createTestItem('2', 'Snare 808', { tags: ['drum'], author: 'User' }),
      createTestItem('3', 'Kick Live', { tags: ['drum'], author: 'Ableton' }),
    ];

    search.rebuildIndex(items);

    const result = search.search({
      text: 'kick',
      tags: ['drum'],
      author: 'ableton',
    });

    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe('Kick 808');
  });

  it('should provide search suggestions', () => {
    const items = [
      createTestItem('1', 'Kick Drum', { author: 'Ableton', tags: ['drum', 'kick'] }),
    ];

    search.rebuildIndex(items);

    const suggestions = search.getSuggestions('dr');
    expect(suggestions.length).toBeGreaterThan(0);
  });
});

describe('CollectionsManager', () => {
  let collections: ReturnType<typeof createCollectionsManager>;

  beforeEach(() => {
    collections = createCollectionsManager();
  });

  it('should manage favorites', () => {
    const item = createTestItem('1', 'Kick');

    collections.addToFavorites(item);
    expect(collections.isFavorite(item)).toBe(true);
    expect(collections.getFavorites().length).toBe(1);

    collections.removeFromFavorites(item);
    expect(collections.isFavorite(item)).toBe(false);
  });

  it('should manage collections', () => {
    const item = createTestItem('1', 'Kick');

    const collection = collections.createCollection('My Drums', '#FF0000');
    collections.addToCollection(item, collection.id);

    const items = collections.getCollectionItems(collection.id);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('1');
  });

  it('should manage color tags', () => {
    const item = createTestItem('1', 'Kick');

    collections.setColorTag(item, 'red');
    const redItems = collections.getItemsByColor('red');
    expect(redItems.length).toBe(1);

    collections.setColorTag(item, null);
    const redItemsAfter = collections.getItemsByColor('red');
    expect(redItemsAfter.length).toBe(0);
  });

  it('should manage recent items', () => {
    const item1 = createTestItem('1', 'Kick');
    const item2 = createTestItem('2', 'Snare');

    collections.addToRecent(item1);
    collections.addToRecent(item2);

    const recent = collections.getRecent();
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('2'); // Most recent first

    collections.clearRecent();
    expect(collections.getRecent().length).toBe(0);
  });
});

describe('TagManager', () => {
  let tags: ReturnType<typeof createTagManager>;

  beforeEach(() => {
    tags = createTagManager();
  });

  it('should manage tags', () => {
    tags.addTag('drum');
    tags.addTag('bass');

    expect(tags.getAllTags()).toContain('drum');
    expect(tags.getAllTags()).toContain('bass');

    tags.removeTag('drum');
    expect(tags.getAllTags()).not.toContain('drum');
  });

  it('should provide tag suggestions', () => {
    tags.addTag('drums');
    tags.addTag('drum-machine');

    const suggestions = tags.getSuggestedTags('drum');
    expect(suggestions.length).toBe(2);
  });
});
