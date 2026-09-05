/**
 * POS Offline Mode — Type Definitions
 *
 * Types untuk IndexedDB offline storage, sync queue, dan network status.
 * Ref: plans/pos-offline-mode-architecture.md Section 4
 */

// =============================================================================
// Product Cache
// =============================================================================

/** Cached product for offline browsing */
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isActive: boolean;
  imageUrl?: string;
  tenantId: string;
  updatedAt: string;
  cachedAt: number;
}

// =============================================================================
// POS Session Cache
// =============================================================================

/** Cached POS session for offline operations */
export interface Session {
  id: string;
  terminalId: string;
  terminalName: string;
  terminalCode: string;
  cashierId: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: number;
  openedAt: string;
  closedAt?: string;
  tenantId: string;
  cachedAt: number;
}

// =============================================================================
// Pending Transactions
// =============================================================================

/** Transaction item in a pending offline transaction */
export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Transaction created offline, waiting for sync to server */
export interface PendingTransaction {
  id: string;
  localId: string;
  sessionId: string;
  terminalId: string;
  items: TransactionItem[];
  paymentMethod: string;
  paidAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  changeAmount: number;
  notes: string | null;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  tenantId: string;
  createdBy: string;
  createdAt: string;
  idempotencyKey: string;
  syncedAt: string | null;
  serverId: string | null;
  serverTransactionNo: string | null;
  syncError: string | null;
  retryCount: number;
}

// =============================================================================
// Sync Queue
// =============================================================================

/** Operation queued for sync to server */
export interface SyncOperation {
  id: string;
  type: 'CREATE_TRANSACTION' | 'UPDATE_SESSION' | 'CLOSE_SESSION';
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  payload: Record<string, unknown>;
  endpoint: string;
  method: string;
  idempotencyKey: string;
  createdAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  nextRetryAt: number;
}

// =============================================================================
// Config
// =============================================================================

/** Configuration entry for offline mode metadata */
export interface OfflineConfig {
  key: string;
  value: string;
  updatedAt: number;
}

// =============================================================================
// Network Status
// =============================================================================

/** Current network/offline mode status */
export type OfflineMode = 'online' | 'offline' | 'syncing';

// =============================================================================
// IndexedDB Store Maps (for type-safe cursor/transaction operations)
// =============================================================================

/** Map of store names to their value types */
export interface DBStoreMap {
  'products': Product;
  'sessions': Session;
  'pending-transactions': PendingTransaction;
  'sync-queue': SyncOperation;
  'config': OfflineConfig;
}

/** Union type of all store names */
export type StoreName = keyof DBStoreMap;

// =============================================================================
// Storage Usage
// =============================================================================

/** Storage usage information */
export interface StorageUsage {
  used: number;
  quota: number;
}

// =============================================================================
// Database Constants
// =============================================================================

/** IndexedDB database name */
export const DB_NAME = 'qalcuity-pos-offline' as const;

/** IndexedDB database version */
export const DB_VERSION = 1 as const;

/** Store name constants */
export const STORES = {
  PRODUCTS: 'products',
  SESSIONS: 'sessions',
  PENDING_TRANSACTIONS: 'pending-transactions',
  SYNC_QUEUE: 'sync-queue',
  CONFIG: 'config',
} as const;
