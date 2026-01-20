import { getUnsyncedScans, markScanSynced, type LocalScan } from './offline-db';

/**
 * Sync unsynced scans to the server
 * Returns list of conflicts detected
 */
export async function syncScansToServer(): Promise<{
    synced: number;
    conflicts: LocalScan[];
    errors: string[];
}> {
    const unsynced = await getUnsyncedScans();
    const conflicts: LocalScan[] = [];
    const errors: string[] = [];
    let synced = 0;

    for (const scan of unsynced) {
        try {
            const response = await fetch('/api/concert/sync-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketId: scan.ticketId,
                    scannedAt: scan.scannedAt,
                    deviceId: scan.deviceId,
                    qrData: scan.qrData,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.conflict) {
                    // Server says this ticket was already scanned by another device
                    await markScanSynced(scan.ticketId, true);
                    conflicts.push(scan);
                } else {
                    await markScanSynced(scan.ticketId, false);
                }
                synced++;
            } else {
                errors.push(`Failed to sync ${scan.ticketId}: ${data.error}`);
            }
        } catch (error) {
            errors.push(`Network error syncing ${scan.ticketId}`);
        }
    }

    return { synced, conflicts, errors };
}

/**
 * Check if online
 */
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Attempt to sync scans, with retry on failure
 */
export async function attemptSync(): Promise<void> {
    if (!isOnline()) {
        console.log('[Sync] Offline, skipping sync');
        return;
    }

    try {
        const result = await syncScansToServer();
        console.log(`[Sync] Synced ${result.synced} scans, ${result.conflicts.length} conflicts`);

        if (result.conflicts.length > 0) {
            // Dispatch custom event for UI to handle
            window.dispatchEvent(new CustomEvent('scan-conflicts', {
                detail: { conflicts: result.conflicts }
            }));
        }
    } catch (error) {
        console.error('[Sync] Error:', error);
    }
}

/**
 * Start background sync (runs periodically)
 */
export function startBackgroundSync(intervalMs: number = 30000): () => void {
    // Initial sync
    attemptSync();

    // Periodic sync
    const interval = setInterval(attemptSync, intervalMs);

    // Sync on coming online
    const onlineHandler = () => {
        console.log('[Sync] Back online, syncing...');
        attemptSync();
    };
    window.addEventListener('online', onlineHandler);

    // Return cleanup function
    return () => {
        clearInterval(interval);
        window.removeEventListener('online', onlineHandler);
    };
}
