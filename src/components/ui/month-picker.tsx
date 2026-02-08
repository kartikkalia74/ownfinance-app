
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format, setMonth, setYear } from "date-fns"

interface MonthPickerProps {
    currentMonth: Date
    onMonthChange: (date: Date) => void
}

export function MonthPicker({ currentMonth, onMonthChange }: MonthPickerProps) {
    const [viewYear, setViewYear] = React.useState(currentMonth.getFullYear())

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    const handlePreviousYear = () => setViewYear(viewYear - 1)
    const handleNextYear = () => setViewYear(viewYear + 1)

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = setMonth(setYear(currentMonth, viewYear), monthIndex)
        onMonthChange(newDate)
    }

    return (
        <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={handlePreviousYear}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold text-sm">{viewYear}</div>
                <Button variant="outline" size="icon" onClick={handleNextYear}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {months.map((month, index) => {
                    const isSelected = currentMonth.getFullYear() === viewYear && currentMonth.getMonth() === index
                    return (
                        <Button
                            key={month}
                            variant={isSelected ? "default" : "ghost"}
                            className={cn(
                                "h-9 text-xs",
                                isSelected && "bg-blue-600 hover:bg-blue-700"
                            )}
                            onClick={() => handleMonthSelect(index)}
                        >
                            {month.slice(0, 3)}
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
