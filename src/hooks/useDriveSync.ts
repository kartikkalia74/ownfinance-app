import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { DriveService } from '@/services/drive';
import { exportDB, importDB, isDbEmpty, subscribeToChanges } from '@/db/sqlite';

const UPLOAD_DEBOUNCE_MS = 5000; // Wait 5s after last write to upload

export function useDriveSync() {
    const { token, logout } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const fileIdRef = useRef<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleError = (err: any) => {
        console.error('Sync Error:', err);
        if (err.message === 'UNAUTHENTICATED') {
            console.warn('Sync: Token expired or invalid. Logging out...');
            logout();
        }
    };

    // Initial Sync on Login / Mount
    useEffect(() => {
        if (!token) return;

        const initSync = async () => {
            try {
                setIsSyncing(true);
                console.log('Sync: Checking for existing backup...');

                const existingFile = await DriveService.findBackupFile(token);

                if (existingFile) {
                    fileIdRef.current = existingFile.id;
                    console.log('Sync: Backup found', existingFile);

                    // If local DB is empty, download and import
                    // If local DB has data, we assume "local is newer" or "conflict" (simplistic: do nothing, let next write overwrite)
                    // Ideally: ask user. But for now: "Import if empty"
                    const empty = await isDbEmpty();
                    if (empty) {
                        console.log('Sync: Local DB is empty, downloading backup...');
                        const blob = await DriveService.downloadFile(token, existingFile.id);
                        const data = new Uint8Array(await blob.arrayBuffer());
                        await importDB(data);
                        console.log('Sync: Backup restored.');
                        // Force a reload or UI update if needed, but the DB is reactive via queries usually re-running
                        window.location.reload(); // Hard reload to refresh all UI states cleanly after db swap
                        return;
                    }
                } else {
                    console.log('Sync: No backup found. Will create one on next write.');
                }
            } catch (err: any) {
                handleError(err);
            } finally {
                setIsSyncing(false);
                setLastSyncTime(new Date());
            }
        };

        // Only run if we haven't synced yet this session (or refine logic)
        // For now, run on mount if token exists
        initSync();

    }, [token, logout]); // Added logout to dependencies

    // Subscribe to DB changes for Auto-Upload
    useEffect(() => {
        if (!token) return;

        const handleDbChange = () => {
            console.log('Sync: DB Changed. Scheduling upload...');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(async () => {
                try {
                    setIsSyncing(true);
                    console.log('Sync: Starting Upload...');
                    const data = await exportDB();
                    const blob = new Blob([data as any], { type: 'application/x-sqlite3' });

                    const result = await DriveService.uploadDatabase(token, blob, fileIdRef.current || undefined);
                    fileIdRef.current = result.id;
                    console.log('Sync: Upload Complete', result);
                    setLastSyncTime(new Date());
                } catch (err: any) {
                    handleError(err);
                } finally {
                    setIsSyncing(false);
                }
            }, UPLOAD_DEBOUNCE_MS);
        };

        const unsubscribe = subscribeToChanges(handleDbChange);
        return () => {
            unsubscribe();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [token, logout]); // Added logout to dependencies

    return { isSyncing, lastSyncTime };
}

