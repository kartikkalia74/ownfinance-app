
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { exec } from "@/db/sqlite"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface BulkCategoryUpdateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedIds: Set<string>
    onSave: () => void
}

interface Category {
    id: string
    name: string
    type: string
}

export function BulkCategoryUpdateDialog({ open, onOpenChange, selectedIds, onSave }: BulkCategoryUpdateDialogProps) {
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [openCombobox, setOpenCombobox] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await exec("SELECT id, name, type FROM categories ORDER BY name ASC");
                const cats = res.map((row: any) => ({
                    id: row[0],
                    name: row[1],
                    type: row[2]
                }));
                setCategories(cats);
            } catch (e) {
                console.error("Failed to fetch categories", e);
            }
        }

        if (open) {
            fetchCategories();
            setSelectedCategoryIds(new Set());
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedIds.size === 0) return;

        setIsLoading(true)

        try {
            const selectedNames = Array.from(selectedCategoryIds).map(id => {
                const cat = categories.find(c => c.id === id);
                return cat ? cat.name : null;
            }).filter(Boolean);

            const categoryName = selectedNames.length > 0 ? selectedNames.join(",") : "Uncategorized";

            // Construct the SQL for bulk update.
            // SQLite doesn't support arrays, so we must construct the IN clause.
            const placeholders = Array.from(selectedIds).map(() => "?").join(",");
            const query = `UPDATE transactions SET category = ? WHERE id IN (${placeholders})`;
            const params = [categoryName, ...Array.from(selectedIds)];

            await exec(query, params);

            onSave();
            onOpenChange(false);
        } catch (e) {
            console.error("Failed to bulk update categories", e)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900 overflow-visible">
                <DialogHeader>
                    <DialogTitle>Bulk Update Categories</DialogTitle>
                    <DialogDescription>
                        Update the category for {selectedIds.size} selected transaction{selectedIds.size !== 1 ? 's' : ''}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="col-span-3 justify-between font-normal h-auto min-h-[40px]"
                                >
                                    {selectedCategoryIds.size > 0
                                        ? (
                                            <div className="flex flex-wrap gap-1">
                                                {Array.from(selectedCategoryIds).map(id => {
                                                    const cat = categories.find(c => c.id === id);
                                                    return cat ? (
                                                        <span key={id} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                                            {cat.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        )
                                        : "Select categories..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 z-[200] pointer-events-auto" align="start">
                                <div className="p-0">
                                    <div className="flex items-center border-b px-3">
                                        <Input
                                            className="border-0 shadow-none focus-visible:ring-0 px-0"
                                            placeholder="Search category..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        {filteredCategories.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                No category found.
                                            </div>
                                        ) : (
                                            filteredCategories.map((category) => (
                                                <div
                                                    key={category.id}
                                                    className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => toggleCategory(category.id)}
                                                >
                                                    <div className={cn(
                                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                        selectedCategoryIds.has(category.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className={cn("h-4 w-4")} />
                                                    </div>
                                                    <span>{category.name}</span>
                                                    <span className="ml-auto text-xs text-muted-foreground">{category.type}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || selectedCategoryIds.size === 0}>
                            {isLoading ? "Updating..." : "Update Categories"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
