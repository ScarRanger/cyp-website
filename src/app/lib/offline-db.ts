/**
 * IndexedDB utility for offline ticket scan storage
 */

const DB_NAME = 'cyp_scanner';
const DB_VERSION = 1;
const STORE_NAME = 'scans';

export interface LocalScan {
    ticketId: string;
    tier: string;
    buyerName: string;
    scannedAt: string;
    deviceId: string;
    synced: boolean;
    conflict: boolean;
    qrData: string;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'ticketId' });
                store.createIndex('synced', 'synced', { unique: false });
                store.createIndex('scannedAt', 'scannedAt', { unique: false });
            }
        };
    });
}

/**
 * Check if a ticket has been scanned locally
 */
export async function isScannedLocally(ticketId: string): Promise<LocalScan | null> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(ticketId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

/**
 * Store a scan locally
 */
export async function storeScanLocally(scan: LocalScan): Promise<void> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(scan);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Get all unsynced scans
 */
export async function getUnsyncedScans(): Promise<LocalScan[]> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(false));

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Mark a scan as synced
 */
export async function markScanSynced(ticketId: string, conflict: boolean = false): Promise<void> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(ticketId);

        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => {
            const scan = getRequest.result;
            if (scan) {
                scan.synced = true;
                scan.conflict = conflict;
                const putRequest = store.put(scan);
                putRequest.onerror = () => reject(putRequest.error);
                putRequest.onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
    });
}

/**
 * Get all scans (for debugging/admin)
 */
export async function getAllScans(): Promise<LocalScan[]> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

/**
 * Clear all scans (for testing)
 */
export async function clearAllScans(): Promise<void> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Generate a unique device ID (stored in localStorage)
 */
export function getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';

    let deviceId = localStorage.getItem('scanner_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('scanner_device_id', deviceId);
    }
    return deviceId;
}
