/**
 * Google Drive Service
 * Handles interactions with the Google Drive API for backup and sync.
 */

const SYNC_FILENAME = 'finance_db.sqlite3';
const MIME_TYPE = 'application/x-sqlite3';

interface DriveFile {
    id: string;
    name: string;
    modifiedTime?: string;
}

export const DriveService = {
    /**
     * Search for the database file in Google Drive.
     * Looks in the root directory.
     */
    async findBackupFile(accessToken: string): Promise<DriveFile | null> {
        // Query to find file by name, not trashed, and matching mime type (optional check)
        const q = `name = '${SYNC_FILENAME}' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, modifiedTime)`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            throw new Error('UNAUTHENTICATED');
        }

        if (!response.ok) {
            throw new Error(`Drive Search Failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0];
        }

        return null;
    },

    /**
     * Download the file content as a Blob.
     */
    async downloadFile(accessToken: string, fileId: string): Promise<Blob> {
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            throw new Error('UNAUTHENTICATED');
        }

        if (!response.ok) {
            throw new Error(`Drive Download Failed: ${response.statusText}`);
        }

        return await response.blob();
    },

    /**
     * Upload the database file.
     * If fileId is provided, it updates the existing file (PATCH).
     * If not, it creates a new file (POST).
     */
    async uploadDatabase(accessToken: string, blob: Blob, existingFileId?: string): Promise<DriveFile> {
        const metadata = {
            name: SYNC_FILENAME,
            mimeType: MIME_TYPE,
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        if (existingFileId) {
            // For updates, we use PATCH on the file ID
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: form
        });

        if (response.status === 401) {
            throw new Error('UNAUTHENTICATED');
        }

        if (!response.ok) {
            throw new Error(`Drive Upload Failed: ${response.statusText}`);
        }

        return await response.json();
    }
};
