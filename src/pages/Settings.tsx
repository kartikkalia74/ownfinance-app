import { useState, useEffect } from "react";
import { useDriveSync } from "@/hooks/useDriveSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";

export default function Settings() {
    const { isSyncing, lastSyncTime, forceSync, deleteRemoteBackup, resetLocalData, exportDataToFile, importDataFromFile } = useDriveSync();
    const { logout } = useAuthStore();
    const [localSyncTime, setLocalSyncTime] = useState<string | null>(localStorage.getItem('finance_last_sync_time'));

    // Keep local sync time updated visually if it changes
    useEffect(() => {
        const interval = setInterval(() => {
            setLocalSyncTime(localStorage.getItem('finance_last_sync_time'));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const displayTime = lastSyncTime ? lastSyncTime.toLocaleString() : (localSyncTime ? new Date(localSyncTime).toLocaleString() : "Never");

    const handleDeleteLocal = async () => {
        await resetLocalData();
    }

    const handleDeleteCloud = async () => {
        if (confirm("Are you sure? This will delete your GOOGLE DRIVE backup. If you lose your local data, you will have no recovery.")) {
            await deleteRemoteBackup();
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Data Synchronization</CardTitle>
                    <CardDescription>
                        Manage your data sync with Google Drive.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div>
                            <p className="font-medium">Sync Status</p>
                            <p className="text-sm text-gray-500">
                                {isSyncing ? (
                                    <span className="text-blue-600 font-medium">Syncing...</span>
                                ) : (
                                    <span className="text-green-600 font-medium">Idle (Waiting for changes)</span>
                                )}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Last Sync: {displayTime}
                            </p>
                        </div>
                        <Button
                            onClick={forceSync}
                            disabled={isSyncing}
                            variant="outline"
                        >
                            {isSyncing ? "Syncing..." : "Sync Now"}
                        </Button>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-sm font-medium text-gray-900">Backup & Restore</h3>
                        <div className="flex flex-wrap gap-4 items-center">
                            <Button variant="outline" onClick={exportDataToFile}>
                                Export Database
                            </Button>

                            <div className="relative">
                                <Button variant="outline" onClick={() => document.getElementById('db-upload')?.click()}>
                                    Import Database
                                </Button>
                                <input
                                    id="db-upload"
                                    type="file"
                                    accept=".sqlite3,.db"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            if (confirm("This will overwrite your current data with the selected file. Continue?")) {
                                                importDataFromFile(e.target.files[0]);
                                            }
                                            e.target.value = ''; // Reset
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Export your data as a backup file, or restore from a previous backup.
                            <span className="font-semibold text-amber-600 block mt-1">
                                Warning: Importing will overwrite both local data and the cloud backup!
                            </span>
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <h3 className="text-sm font-medium mb-4 text-red-600">Danger Zone</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Clear Local Data</p>
                                    <p className="text-xs text-gray-500">Deletes the local database on this device. The app will reload and try to download from Cloud.</p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={handleDeleteLocal}>
                                    Delete Local Data
                                </Button>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Delete Cloud Backup</p>
                                    <p className="text-xs text-gray-500">Deletes the backup file on Google Drive. Your local data remains safe.</p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={handleDeleteCloud}>
                                    Delete Cloud Backup
                                </Button>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Logout</p>
                                    <p className="text-xs text-gray-500">Sign out of your account.</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Finance PWA v0.1.1
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
