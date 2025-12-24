import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { exec } from "@/db/sqlite"
import { useAuthStore } from "@/store/auth"
import { CategoryDialog } from "@/components/categories/CategoryDialog"

interface Category {
    id: string
    name: string
    color: string
    type: 'income' | 'expense'
}

export default function Categories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    const fetchCategories = async () => {
        try {
            const result = await exec("SELECT * FROM categories ORDER BY name ASC");
            setCategories(result.map((r: any) => ({
                id: r[0],
                name: r[1],
                color: r[2],
                type: r[3] as 'income' | 'expense'
            })));
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            await exec("DELETE FROM categories WHERE id = ?", [id]);
            fetchCategories();
        } catch (error) {
            console.error("Failed to delete category", error);
        }
    }

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    }

    const handleCreate = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Categories</h1>
                    <p className="text-gray-500 mt-1">Manage your income and expense categories.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" /> Add Category
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading categories...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                        <Card key={category.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <div>
                                        <p className="font-medium text-gray-900">{category.name}</p>
                                        <Badge variant="secondary" className="text-xs mt-1 capitalize">
                                            {category.type}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                                        <Pencil className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={editingCategory}
                onSuccess={fetchCategories}
            />
        </div>
    )
}
