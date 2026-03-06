/**
 * Tag Editor
 * 
 * Edit metadata and tags for browser items:
 * - Batch tagging
 * - Tag suggestions
 * - Metadata templates
 * - Auto-tagging from analysis
 */

import { BrowserMetadata, PackInfo } from "../types.js";

export interface TagRule {
  /** Rule name */
  name: string;
  /** Condition for applying rule */
  condition: (item: BrowserMetadata) => boolean;
  /** Tags to add */
  addTags: string[];
  /** Tags to remove */
  removeTags: string[];
}

export interface MetadataTemplate {
  /** Template name */
  name: string;
  /** Default values */
  defaults: Partial<BrowserMetadata>;
  /** Required fields */
  required: (keyof BrowserMetadata)[];
  /** Auto-generate tags */
  autoTags: string[];
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  source: "analysis" | "similar" | "history" | "template";
}

export class TagEditor {
  private _items: Map<string, BrowserMetadata> = new Map();
  private _rules: TagRule[] = [];
  private _templates: Map<string, MetadataTemplate> = new Map();
  private _tagHistory: Set<string> = new Set();
  private _commonTags: Map<string, number> = new Map();

  // ---------------------------------------------------------------------------
  // Item Management
  // ---------------------------------------------------------------------------

  addItem(metadata: BrowserMetadata): void {
    this._items.set(metadata.id, { ...metadata });
    this._updateTagStats(metadata.tags);
  }

  removeItem(id: string): boolean {
    return this._items.delete(id);
  }

  getItem(id: string): BrowserMetadata | undefined {
    return this._items.get(id);
  }

  getAllItems(): BrowserMetadata[] {
    return Array.from(this._items.values());
  }

  clearItems(): void {
    this._items.clear();
  }

  // ---------------------------------------------------------------------------
  // Tag Editing
  // ---------------------------------------------------------------------------

  setTags(id: string, tags: string[]): boolean {
    const item = this._items.get(id);
    if (!item) return false;

    const oldTags = item.tags;
    item.tags = [...tags];
    item.modified = new Date();

    // Update stats
    oldTags.forEach(tag => this._decrementTagCount(tag));
    tags.forEach(tag => this._incrementTagCount(tag));

    return true;
  }

  addTag(id: string, tag: string): boolean {
    const item = this._items.get(id);
    if (!item) return false;

    if (!item.tags.includes(tag)) {
      item.tags.push(tag);
      item.modified = new Date();
      this._incrementTagCount(tag);
      this._tagHistory.add(tag);
      return true;
    }
    return false;
  }

  removeTag(id: string, tag: string): boolean {
    const item = this._items.get(id);
    if (!item) return false;

    const index = item.tags.indexOf(tag);
    if (index >= 0) {
      item.tags.splice(index, 1);
      item.modified = new Date();
      this._decrementTagCount(tag);
      return true;
    }
    return false;
  }

  addTagsToAll(tags: string[]): void {
    for (const item of this._items.values()) {
      for (const tag of tags) {
        if (!item.tags.includes(tag)) {
          item.tags.push(tag);
          this._incrementTagCount(tag);
        }
      }
      item.modified = new Date();
    }
  }

  removeTagsFromAll(tags: string[]): void {
    for (const item of this._items.values()) {
      for (const tag of tags) {
        const index = item.tags.indexOf(tag);
        if (index >= 0) {
          item.tags.splice(index, 1);
          this._decrementTagCount(tag);
        }
      }
      item.modified = new Date();
    }
  }

  replaceTag(oldTag: string, newTag: string): void {
    for (const item of this._items.values()) {
      const index = item.tags.indexOf(oldTag);
      if (index >= 0) {
        item.tags[index] = newTag;
        item.modified = new Date();
      }
    }
    this._decrementTagCount(oldTag);
    this._incrementTagCount(newTag);
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  batchEdit(ids: string[], updates: Partial<BrowserMetadata>): void {
    for (const id of ids) {
      const item = this._items.get(id);
      if (item) {
        Object.assign(item, updates);
        item.modified = new Date();

        if (updates.tags) {
          updates.tags.forEach(tag => this._tagHistory.add(tag));
        }
      }
    }
  }

  batchAddTag(ids: string[], tag: string): void {
    for (const id of ids) {
      this.addTag(id, tag);
    }
  }

  batchRemoveTag(ids: string[], tag: string): void {
    for (const id of ids) {
      this.removeTag(id, tag);
    }
  }

  // ---------------------------------------------------------------------------
  // Tag Suggestions
  // ---------------------------------------------------------------------------

  getSuggestions(id: string): TagSuggestion[] {
    const item = this._items.get(id);
    if (!item) return [];

    const suggestions: TagSuggestion[] = [];

    // Suggest tags used by similar items
    const similarTags = this._findSimilarItemTags(item);
    for (const tag of similarTags) {
      if (!item.tags.includes(tag)) {
        suggestions.push({
          tag,
          confidence: 0.7,
          source: "similar",
        });
      }
    }

    // Suggest common tags
    const common = this.getCommonTags(10);
    for (const { tag } of common) {
      if (!item.tags.includes(tag)) {
        suggestions.push({
          tag,
          confidence: 0.5,
          source: "history",
        });
      }
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Remove duplicates
    const seen = new Set<string>();
    return suggestions.filter(s => {
      if (seen.has(s.tag)) return false;
      seen.add(s.tag);
      return true;
    });
  }

  private _findSimilarItemTags(item: BrowserMetadata): string[] {
    const similarTags: Map<string, number> = new Map();

    for (const other of this._items.values()) {
      if (other.id === item.id) continue;

      // Check for tag overlap
      const commonTags = other.tags.filter(t => item.tags.includes(t));
      if (commonTags.length > 0) {
        // Add tags from this similar item
        for (const tag of other.tags) {
          if (!item.tags.includes(tag)) {
            similarTags.set(tag, (similarTags.get(tag) ?? 0) + commonTags.length);
          }
        }
      }
    }

    // Return top tags
    return Array.from(similarTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  getCommonTags(limit = 20): { tag: string; count: number }[] {
    return Array.from(this._commonTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  getRecentTags(limit = 20): string[] {
    return Array.from(this._tagHistory).slice(-limit);
  }

  // ---------------------------------------------------------------------------
  // Auto-tagging
  // ---------------------------------------------------------------------------

  autoTag(id: string): string[] {
    const item = this._items.get(id);
    if (!item) return [];

    const newTags: string[] = [];

    // Apply rules
    for (const rule of this._rules) {
      if (rule.condition(item)) {
        for (const tag of rule.addTags) {
          if (!item.tags.includes(tag)) {
            item.tags.push(tag);
            newTags.push(tag);
            this._incrementTagCount(tag);
          }
        }

        for (const tag of rule.removeTags) {
          const index = item.tags.indexOf(tag);
          if (index >= 0) {
            item.tags.splice(index, 1);
            this._decrementTagCount(tag);
          }
        }
      }
    }

    if (newTags.length > 0) {
      item.modified = new Date();
    }

    return newTags;
  }

  autoTagAll(): Map<string, string[]> {
    const results = new Map<string, string[]>();

    for (const id of this._items.keys()) {
      const newTags = this.autoTag(id);
      if (newTags.length > 0) {
        results.set(id, newTags);
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Tag Rules
  // ---------------------------------------------------------------------------

  addRule(rule: TagRule): void {
    this._rules.push(rule);
  }

  removeRule(ruleName: string): boolean {
    const index = this._rules.findIndex(r => r.name === ruleName);
    if (index >= 0) {
      this._rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): TagRule[] {
    return [...this._rules];
  }

  clearRules(): void {
    this._rules = [];
  }

  // ---------------------------------------------------------------------------
  // Metadata Templates
  // ---------------------------------------------------------------------------

  saveTemplate(name: string, template: Omit<MetadataTemplate, "name">): void {
    this._templates.set(name, { name, ...template });
  }

  applyTemplate(id: string, templateName: string): boolean {
    const item = this._items.get(id);
    const template = this._templates.get(templateName);

    if (!item || !template) return false;

    // Apply defaults
    Object.assign(item, template.defaults);

    // Add auto-tags
    for (const tag of template.autoTags) {
      if (!item.tags.includes(tag)) {
        item.tags.push(tag);
        this._incrementTagCount(tag);
      }
    }

    item.modified = new Date();
    return true;
  }

  getTemplate(name: string): MetadataTemplate | undefined {
    return this._templates.get(name);
  }

  getTemplates(): MetadataTemplate[] {
    return Array.from(this._templates.values());
  }

  deleteTemplate(name: string): boolean {
    return this._templates.delete(name);
  }

  // ---------------------------------------------------------------------------
  // Tag Statistics
  // ---------------------------------------------------------------------------

  private _updateTagStats(tags: string[]): void {
    for (const tag of tags) {
      this._incrementTagCount(tag);
    }
  }

  private _incrementTagCount(tag: string): void {
    this._commonTags.set(tag, (this._commonTags.get(tag) ?? 0) + 1);
    this._tagHistory.add(tag);
  }

  private _decrementTagCount(tag: string): void {
    const count = this._commonTags.get(tag) ?? 0;
    if (count > 1) {
      this._commonTags.set(tag, count - 1);
    } else {
      this._commonTags.delete(tag);
    }
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  findUntagged(): BrowserMetadata[] {
    return this.getAllItems().filter(item => item.tags.length === 0);
  }

  findDuplicates(): BrowserMetadata[][] {
    const byName = new Map<string, BrowserMetadata[]>();

    for (const item of this._items.values()) {
      const key = item.name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, []);
      }
      byName.get(key)!.push(item);
    }

    return Array.from(byName.values()).filter(group => group.length > 1);
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportChanges(): { id: string; changes: Partial<BrowserMetadata> }[] {
    return this.getAllItems().map(item => ({
      id: item.id,
      changes: {
        tags: item.tags,
        name: item.name,
        author: item.author,
        description: item.description,
        modified: item.modified,
      },
    }));
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createTagEditor(): TagEditor {
  return new TagEditor();
}

export function createTagRule(
  name: string,
  condition: (item: BrowserMetadata) => boolean,
  addTags: string[],
  removeTags: string[] = []
): TagRule {
  return { name, condition, addTags, removeTags };
}

export function createMetadataTemplate(
  name: string,
  defaults: Partial<BrowserMetadata>,
  required: (keyof BrowserMetadata)[] = [],
  autoTags: string[] = []
): MetadataTemplate {
  return { name, defaults, required, autoTags };
}
