
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { exec } from "@/db/sqlite"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
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
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search category..." />
                                    <CommandList>
                                        <CommandEmpty>No category found.</CommandEmpty>
                                        <CommandGroup>
                                            {categories.map((category) => (
                                                <CommandItem
                                                    key={category.id}
                                                    value={category.name} // Use name for search filtering
                                                    onSelect={(currentValue) => {
                                                        // We match by name because value must be derived from label usually in dumb cmdk
                                                        // But we can look it up.
                                                        // Actually, cmdk usually lowercases `value`.
                                                        // Better to iterate and find ID.
                                                        const cat = categories.find((c) => c.name.toLowerCase() === currentValue.toLowerCase() || c.name === currentValue)
                                                        if (cat) {
                                                            toggleCategory(cat.id);
                                                        }
                                                        // Keep combobox open for multi-select
                                                        // setOpenCombobox(false)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCategoryIds.has(category.id) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {category.name}
                                                    <span className="ml-auto text-xs text-gray-400">{category.type}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
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
