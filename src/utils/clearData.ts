import { closeAndClearDB } from "@/db/sqlite";
import { DriveService } from "@/services/drive";

export async function clearAllData(
    token: string | null,
    onProgress?: (msg: string) => void
) {
    // 1. Delete from Drive
    if (token) {
        onProgress?.("Checking cloud backup...");
        try {
            const file = await DriveService.findBackupFile(token);
            if (file) {
                onProgress?.("Deleting cloud backup...");
                await DriveService.deleteFile(token, file.id);
                console.log("Cloud backup deleted.");
            } else {
                console.log("No cloud backup found.");
            }
        } catch (e) {
            console.error("Failed to clear cloud data:", e);
            onProgress?.("Failed to clear cloud backup (network error or expired session). Proceeding...");
            // Non-blocking failure? Maybe we want to stop? 
            // For "Nuclear Option", we usually want to clear as much as possible.
        }
    }

    // 2. Clear Local Database (OPFS)
    onProgress?.("Clearing local database...");
    await closeAndClearDB();

    // 3. Clear Local Storage (Preferences, Auth)
    onProgress?.("Clearing local storage...");
    localStorage.clear();
    sessionStorage.clear();

    onProgress?.("Done. Reloading...");

    // 4. Reload
    window.location.reload();
}
