import { useNavigate } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
import { Search, Plus, ArrowUpRight, ArrowDownRight, ChevronRight, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, getInitials, getColorForName } from "@/lib/utils"
import { exec } from "@/db/sqlite"
import { AddContactDialog } from "@/components/lending/AddContactDialog"

interface Contact {
    id: string
    name: string
    email: string
    balance: number
    mobile: string
    notes: string
}

export default function Lending() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const fetchContacts = async () => {
        try {
            setIsLoading(true);
            const result = await exec("SELECT id, name, email, balance, mobile, notes FROM contacts ORDER BY name ASC");
            const mappedContacts = result.map((row: any) => ({
                id: row[0],
                name: row[1],
                email: row[2],
                balance: row[3],
                mobile: row[4],
                notes: row[5]
            }));
            setContacts(mappedContacts);
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [contacts, searchQuery]);

    const { totalOwed, totalOwe, owedCount, oweCount } = useMemo(() => {
        let owed = 0;
        let owe = 0;
        let owedC = 0;
        let oweC = 0;

        contacts.forEach(c => {
            if (c.balance > 0) {
                owed += c.balance;
                owedC++;
            } else if (c.balance < 0) {
                owe += Math.abs(c.balance);
                oweC++;
            }
        });

        return { totalOwed: owed, totalOwe: owe, owedCount: owedC, oweCount: oweC };
    }, [contacts]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Borrow & Lend</h1>
                    <p className="text-gray-500 mt-1">Track money lent to friends and borrowed amounts.</p>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm shadow-blue-200"
                >
                    <Plus className="w-4 h-4" /> New Contact
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-100 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight className="w-24 h-24 text-green-600" />
                    </div>
                    <div className="relative">
                        <h3 className="text-gray-500 text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Total You Are Owed
                        </h3>
                        <p className="text-4xl font-bold text-gray-900 mt-3 tracking-tight">₹{totalOwed.toLocaleString()}</p>
                        <p className="text-sm text-green-600 mt-1 font-medium">From {owedCount} {owedCount === 1 ? 'contact' : 'contacts'}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-red-100 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowDownRight className="w-24 h-24 text-red-600" />
                    </div>
                    <div className="relative">
                        <h3 className="text-gray-500 text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Total You Owe
                        </h3>
                        <p className="text-4xl font-bold text-gray-900 mt-3 tracking-tight">₹{totalOwe.toLocaleString()}</p>
                        <p className="text-sm text-red-600 mt-1 font-medium">To {oweCount} {oweCount === 1 ? 'contact' : 'contacts'}</p>
                    </div>
                </div>
            </div>

            {/* Contacts List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        Contacts
                    </h3>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50/50"
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-50 min-h-[200px] relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => (
                            <div
                                key={contact.id}
                                onClick={() => navigate(`/borrow-lend/${contact.id}`)}
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm", getColorForName(contact.name))}>
                                        {getInitials(contact.name)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                                        <p className="text-xs text-gray-400">{contact.email || contact.mobile || 'No details'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-bold text-lg",
                                            contact.balance > 0 ? "text-green-600" : (contact.balance < 0 ? "text-red-600" : "text-gray-400")
                                        )}>
                                            {contact.balance === 0 ? "Settled" : `₹${Math.abs(contact.balance).toLocaleString()}`}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {contact.balance > 0 ? "Owes you" : (contact.balance < 0 ? "You owe" : "No balance")}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No contacts found</p>
                            <p className="text-sm text-gray-400 mt-1">Add a new contact to start tracking balances.</p>
                        </div>
                    )}
                </div>
            </div>

            <AddContactDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onContactAdded={fetchContacts}
            />
        </div>
    )
}
