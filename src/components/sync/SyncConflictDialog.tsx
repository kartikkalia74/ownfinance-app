import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface SyncConflictDialogProps {
    isOpen: boolean;
    onConfirm: () => void; // User chooses "Yes, Load Cloud Data"
    onCancel: () => void;  // User chooses "No, Keep Local"
    cloudDate?: Date;
    localDate?: Date;
}

export function SyncConflictDialog({ isOpen, onConfirm, onCancel, cloudDate, localDate }: SyncConflictDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sync Conflict Detected</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            We found a newer backup of your data on Google Drive.
                        </p>
                        <div className="text-sm bg-gray-50 p-2 rounded border border-gray-100">
                            <p><strong>Cloud Backup:</strong> {cloudDate ? cloudDate.toLocaleString() : 'Unknown'}</p>
                            {localDate && <p><strong>Local Data:</strong> {localDate.toLocaleString()}</p>}
                        </div>
                        <p className="font-medium text-red-600">
                            Do you want to replace your local data with the cloud backup?
                            This action cannot be undone.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>No, Keep Local</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
                        Yes, Load Cloud Data
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
