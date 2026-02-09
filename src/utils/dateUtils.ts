import { format, isToday, isYesterday, differenceInDays, parseISO } from "date-fns";

export function formatTransactionDate(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;

    // Check if date is valid
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }

    if (isToday(date)) {
        return "Today";
    }

    if (isYesterday(date)) {
        return "Yesterday";
    }

    const daysAgo = differenceInDays(new Date(), date);
    if (daysAgo < 7 && daysAgo > 1) {
        return `${daysAgo} days ago`;
    }

    // Check if it's the current year
    const currentYear = new Date().getFullYear();
    if (date.getFullYear() === currentYear) {
        return format(date, "MMM d"); // e.g., "Dec 20"
    }

    return format(date, "MMM d, yyyy"); // e.g., "Dec 20, 2024"
}
