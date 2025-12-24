
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { exec } from "@/db/sqlite"

interface AddLedgerEntryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contactId: string
    type: 'lent' | 'borrowed'
    onEntryAdded: () => void
}

export function AddLedgerEntryDialog({ open, onOpenChange, contactId, type, onEntryAdded }: AddLedgerEntryDialogProps) {
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = parseFloat(amount)
        if (isNaN(amt) || amt <= 0) return

        setIsLoading(true)

        try {
            const entryId = crypto.randomUUID()

            // 1. Add record to ledger
            await exec(`
                INSERT INTO ledger (id, contact_id, date, amount, description, type)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [entryId, contactId, date, amt, description, type])

            // 2. Update contact balance
            // If lent: balance increases (they owe us more)
            // If borrowed: balance decreases (we owe them or we owe them more)
            const balanceChange = type === 'lent' ? amt : -amt
            await exec(`
                UPDATE contacts 
                SET balance = balance + ? 
                WHERE id = ?
            `, [balanceChange, contactId])

            onEntryAdded()
            onOpenChange(false)

            // Reset form
            setAmount("")
            setDescription("")
            setDate(new Date().toISOString().split('T')[0])
        } catch (error) {
            console.error("Failed to add ledger entry", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>{type === 'lent' ? 'You Lent Money' : 'You Borrowed Money'}</DialogTitle>
                    <DialogDescription>
                        {type === 'lent'
                            ? 'Record money you gave to this contact.'
                            : 'Record money you received from this contact.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Notes</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional descriptive note"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={type === 'lent' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {isLoading ? "Saving..." : "Save Entry"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
