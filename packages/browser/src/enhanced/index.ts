/**
 * @daw/browser/enhanced
 * 
 * Enhanced browser features for in-browser DAW:
 * - Pack creation and management
 * - Tag editing and auto-tagging
 * - Preview caching
 * - Cloud integration hooks
 */

// =============================================================================
// Pack Creator
// =============================================================================

export { PackCreator } from "./PackCreator.js";

export type {
  PackConfig,
  PackItem,
  PackData,
  CloudSyncProvider,
  CloudPackInfo,
} from "./PackCreator.js";

export {
  createPack,
  loadPackFromFile,
} from "./PackCreator.js";

// =============================================================================
// Tag Editor
// =============================================================================

export { TagEditor } from "./TagEditor.js";

export type {
  TagRule,
  MetadataTemplate,
  TagSuggestion,
} from "./TagEditor.js";

export {
  createTagEditor,
  createTagRule,
  createMetadataTemplate,
} from "./TagEditor.js";

// =============================================================================
// Preview Cache
// =============================================================================

export { PreviewCache } from "./PreviewCache.js";

export type {
  CacheEntry,
  CacheStats,
  CacheConfig,
} from "./PreviewCache.js";

export {
  createPreviewCache,
  generateCacheKey,
} from "./PreviewCache.js";

// =============================================================================
// Cloud Integration
// =============================================================================

export { CloudIntegration } from "./CloudIntegration.js";

export type {
  CloudProviderConfig,
  CloudSyncStatus,
  SyncableItem,
  ShareLink,
  CloudProvider,
  CloudFile,
} from "./CloudIntegration.js";

export {
  createCloudIntegration,
  createDropboxProvider,
  createGoogleDriveProvider,
} from "./CloudIntegration.js";

// =============================================================================
// Version
// =============================================================================

export const BROWSER_ENHANCED_VERSION = "1.0.0";
