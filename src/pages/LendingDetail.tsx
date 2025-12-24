import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback } from "react"
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Plus, Minus, Download, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { exec } from "@/db/sqlite"
import { cn, getInitials, getColorForName } from "@/lib/utils"
import { AddLedgerEntryDialog } from "@/components/lending/AddLedgerEntryDialog"
import { format } from "date-fns"

interface Contact {
    id: string
    name: string
    balance: number
}

interface LedgerEntry {
    id: string
    date: string
    amount: number
    description: string
    type: 'lent' | 'borrowed'
}

export default function LendingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [contact, setContact] = useState<Contact | null>(null);
    const [history, setHistory] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLentDialogOpen, setIsLentDialogOpen] = useState(false);
    const [isBorrowedDialogOpen, setIsBorrowedDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);

            // Fetch contact
            const contactRes = await exec("SELECT id, name, balance FROM contacts WHERE id = ?", [id]);
            if (contactRes.length > 0) {
                setContact({
                    id: contactRes[0][0],
                    name: contactRes[0][1],
                    balance: contactRes[0][2]
                });
            } else {
                navigate("/borrow-lend");
                return;
            }

            // Fetch history
            const historyRes = await exec("SELECT id, date, amount, description, type FROM ledger WHERE contact_id = ? ORDER BY date DESC", [id]);
            const mappedHistory = historyRes.map((row: any) => ({
                id: row[0],
                date: row[1],
                amount: row[2],
                description: row[3],
                type: row[4]
            }));
            setHistory(mappedHistory);
        } catch (error) {
            console.error("Failed to fetch contact detail", error);
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const deleteEntry = async (entryId: string, entryType: string, entryAmount: number) => {
        if (!window.confirm("Are you sure you want to delete this entry?")) return;

        try {
            // 1. Delete from ledger
            await exec("DELETE FROM ledger WHERE id = ?", [entryId]);

            // 2. Reverse balance update
            const balanceAdjustment = entryType === 'lent' ? -entryAmount : entryAmount;
            await exec("UPDATE contacts SET balance = balance + ? WHERE id = ?", [balanceAdjustment, id]);

            fetchData();
        } catch (error) {
            console.error("Failed to delete entry", error);
        }
    }

    if (isLoading && !contact) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!contact) return null;

    const initials = getInitials(contact.name);
    const color = getColorForName(contact.name);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Nav Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/borrow-lend")} className="rounded-full hover:bg-gray-100">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" /> Export
                </Button>
            </div>

            {/* Balance Hero */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-50/50 -z-10"></div>
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold mb-4 ${color}`}>
                    {initials}
                </div>
                <p className="text-gray-500 font-medium">
                    {contact.balance > 0 ? "Total they owe you" : (contact.balance < 0 ? "Total you owe them" : "Settle up")}
                </p>
                <h2 className={cn(
                    "text-5xl font-bold mt-2 tracking-tight",
                    contact.balance > 0 ? "text-green-600" : (contact.balance < 0 ? "text-red-600" : "text-gray-400")
                )}>
                    ₹{Math.abs(contact.balance).toLocaleString()}
                </h2>

                <div className="flex items-center justify-center gap-4 mt-8">
                    <Button onClick={() => setIsLentDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6">
                        <Plus className="w-4 h-4" /> You Lent
                    </Button>
                    <Button onClick={() => setIsBorrowedDialogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white gap-2 px-6">
                        <Minus className="w-4 h-4" /> You Borrowed
                    </Button>
                </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 ml-1">Transaction History</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {history.length > 0 ? (
                        history.map((tx) => (
                            <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${tx.type === 'lent' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {tx.type === 'lent' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">{tx.description || (tx.type === 'lent' ? 'Money Lent' : 'Money Borrowed')}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-gray-100 text-gray-500">
                                                {format(new Date(tx.date), "MMM dd, yyyy")}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`font-bold text-lg ${tx.type === 'lent' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'lent' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteEntry(tx.id, tx.type, tx.amount)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 font-medium">No transactions yet</p>
                            <p className="text-sm text-gray-400 mt-1">Start by recording a payment.</p>
                        </div>
                    )}
                </div>
            </div>

            <AddLedgerEntryDialog
                open={isLentDialogOpen}
                onOpenChange={setIsLentDialogOpen}
                contactId={id!}
                type="lent"
                onEntryAdded={fetchData}
            />
            <AddLedgerEntryDialog
                open={isBorrowedDialogOpen}
                onOpenChange={setIsBorrowedDialogOpen}
                contactId={id!}
                type="borrowed"
                onEntryAdded={fetchData}
            />
        </div>
    )
}
