import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { DriveService } from '@/services/drive';
import { exportDB, importDB, isDbEmpty, subscribeToChanges, closeAndClearDB } from '@/db/sqlite';

const UPLOAD_DEBOUNCE_MS = 5000; // Wait 5s after last write to upload

export function useDriveSync() {
    const { token, logout } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const fileIdRef = useRef<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [syncConflict, setSyncConflict] = useState<{ cloudDate: Date; localDate: Date } | null>(null);

    const handleError = (err: any) => {
        console.error('Sync Error:', err);
        if (err.message === 'UNAUTHENTICATED') {
            console.warn('Sync: Token expired or invalid. Logging out...');
            logout();
        }
    };

    const resolveConflict = async (useCloud: boolean) => {
        if (!token || !fileIdRef.current) return;

        if (useCloud) {
            try {
                setIsSyncing(true);
                console.log('Sync: Resolving conflict - Downloading cloud backup...');
                const blob = await DriveService.downloadFile(token, fileIdRef.current);
                const data = new Uint8Array(await blob.arrayBuffer());
                await importDB(data);
                console.log('Sync: Backup restored.');

                // Update local sync time to now to avoid immediate re-trigger
                localStorage.setItem('finance_last_sync_time', new Date().toISOString());
                setLastSyncTime(new Date());

                window.location.reload();
            } catch (err) {
                handleError(err);
            } finally {
                setIsSyncing(false);
                setSyncConflict(null);
            }
        } else {
            // Keep local: Just update the timestamp so we don't ask again until next change
            console.log('Sync: Resolving conflict - Keeping local data.');
            localStorage.setItem('finance_last_sync_time', new Date().toISOString());
            // Trigger an upload to overwrite cloud? 
            // Ideally yes, to maximize consistency.
            // Let's trigger the upload logic manually.
            const data = await exportDB();
            const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
            await DriveService.uploadDatabase(token, blob, fileIdRef.current || undefined);
            setSyncConflict(null);
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

                    const empty = await isDbEmpty();
                    const lastLocalSync = localStorage.getItem('finance_last_sync_time');
                    const cloudModifiedTime = existingFile.modifiedTime ? new Date(existingFile.modifiedTime as string) : new Date();

                    if (empty) {
                        console.log('Sync: Local DB is empty, downloading backup...');
                        const blob = await DriveService.downloadFile(token, existingFile.id);
                        const data = new Uint8Array(await blob.arrayBuffer());
                        await importDB(data);
                        console.log('Sync: Backup restored.');
                        localStorage.setItem('finance_last_sync_time', cloudModifiedTime.toISOString());
                        window.location.reload();
                        return;
                    }

                    // Check for conflict
                    // If Cloud is NEWER than last known sync time, and we have local data -> Conflict
                    if (lastLocalSync) {
                        const localSyncDate = new Date(lastLocalSync);
                        // Give a small buffer (e.g., 10 seconds) to avoid clock skew issues
                        if (cloudModifiedTime.getTime() > localSyncDate.getTime() + 10000) {
                            console.log('Sync: Conflict detected! Cloud is newer.');
                            setSyncConflict({
                                cloudDate: cloudModifiedTime,
                                localDate: localSyncDate
                            });
                        }
                    } else {
                        // We have local data but no sync record? 
                        // Maybe cleared cookies or new browser with existing OPFS?
                        // Conservative: Ask user inside conflict dialog
                        console.log('Sync: No local sync record found but DB has data. Checking timestamps...');
                        // In this case, we treat it as a conflict just to be safe if cloud is there
                        setSyncConflict({
                            cloudDate: cloudModifiedTime,
                            localDate: new Date() // Unknown real local modification time
                        });
                    }

                } else {
                    console.log('Sync: No backup found. Will create one on next write.');
                }
            } catch (err: any) {
                handleError(err);
            } finally {
                setIsSyncing(false);
                if (!syncConflict) { // Don't update time if we are halted on conflict
                    // setLastSyncTime(new Date()); 
                }
            }
        };

        initSync();

    }, [token, logout]);

    // Subscribe to DB changes for Auto-Upload
    useEffect(() => {
        if (!token) return;

        const handleDbChange = () => {
            console.log('Sync: DB Changed. Scheduling upload...');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(async () => {
                if (syncConflict) return; // Don't auto-upload if in conflict state

                try {
                    setIsSyncing(true);
                    console.log('Sync: Starting Upload...');
                    const data = await exportDB();
                    const blob = new Blob([data as any], { type: 'application/x-sqlite3' });

                    const result = await DriveService.uploadDatabase(token, blob, fileIdRef.current || undefined);
                    fileIdRef.current = result.id;
                    console.log('Sync: Upload Complete', result);

                    const now = new Date();
                    setLastSyncTime(now);
                    localStorage.setItem('finance_last_sync_time', now.toISOString());

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
    }, [token, logout, syncConflict]);

    const forceSync = async () => {
        window.location.reload();
    };

    const resetLocalData = async () => {
        if (confirm("Are you sure? This will delete your LOCAL database. The app will reload.")) {
            localStorage.removeItem('finance_last_sync_time');
            await closeAndClearDB();
            window.location.reload();
        }
    };

    const deleteRemoteBackup = async () => {
        if (!token || !fileIdRef.current) return;
        try {
            setIsSyncing(true);
            await DriveService.deleteFile(token, fileIdRef.current);
            fileIdRef.current = null;
            console.log('Sync: Remote backup deleted.');
            alert("Cloud backup deleted successfully.");
        } catch (err) {
            handleError(err);
            alert("Failed to delete cloud backup.");
        } finally {
            setIsSyncing(false);
        }
    };

    const exportDataToFile = async () => {
        try {
            const data = await exportDB();
            const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.sqlite3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            handleError(err);
            alert("Failed to export database.");
        }
    };

    const importDataFromFile = async (file: File) => {
        try {
            setIsSyncing(true);
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);

            // 1. Import to local SQLite
            await importDB(data);
            console.log('Import: Local DB updated.');

            // 2. Upload to Cloud immediately to ensure sync
            if (token) {
                console.log('Import: Uploading to Cloud...');
                // We re-export to ensure we are sending exactly what is in DB
                // (Though 'data' is valid, let's be safe and use uniform flow if needed, 
                // but using 'data' directly is more efficient)
                const blob = new Blob([data as any], { type: 'application/x-sqlite3' });
                const result = await DriveService.uploadDatabase(token, blob, fileIdRef.current || undefined);
                fileIdRef.current = result.id;
                console.log('Import: Cloud Sync Complete.');

                const now = new Date();
                setLastSyncTime(now);
                localStorage.setItem('finance_last_sync_time', now.toISOString());
            }

            alert("Database imported successfully. App will reload.");
            window.location.reload();

        } catch (err) {
            handleError(err);
            alert("Failed to import database.");
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        isSyncing,
        lastSyncTime,
        syncConflict,
        resolveConflict,
        forceSync,
        deleteRemoteBackup,
        resetLocalData,
        exportDataToFile,
        importDataFromFile
    };
}
