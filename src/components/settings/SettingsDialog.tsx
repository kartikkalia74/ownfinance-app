import { useState } from "react";
import { Settings, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { clearAllData } from "@/utils/clearData";
import { useAuthStore } from "@/store/auth";

export default function SettingsDialog() {
    const { token } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [progress, setProgress] = useState("");

    const handleClearData = async () => {
        setIsCleaning(true);
        await clearAllData(token, (msg) => setProgress(msg));
        // No need to set cleaning false as app will reload
    };

    const resetState = () => {
        setShowConfirm(false);
        setIsCleaning(false);
        setProgress("");
    };

    const onOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            // Reset state when closed
            setTimeout(resetState, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!showConfirm ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Settings</DialogTitle>
                            <DialogDescription>
                                Manage your application preferences and data.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 space-y-4">
                            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                                <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Dangerous Zone
                                </h3>
                                <p className="text-xs text-red-600 mb-4">
                                    Permanently delete all your data, including transactions, categories, and cloud backups.
                                </p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full flex items-center gap-2"
                                    onClick={() => setShowConfirm(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Clear All Data
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Delete All Data?
                            </DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete your database, local settings, and remote backup from Google Drive.
                            </DialogDescription>
                        </DialogHeader>

                        {isCleaning ? (
                            <div className="py-6 flex flex-col items-center justify-center space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="text-sm text-gray-500">{progress}</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Warning</AlertTitle>
                                    <AlertDescription>
                                        You will be logged out and the page will reload.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {!isCleaning && (
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleClearData}>
                                    Run System Reset
                                </Button>
                            </DialogFooter>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
