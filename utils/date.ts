/**
 * Date utility functions for local date formatting and safe calculations
 * (avoids UTC offset shifts when dealing with YYYY-MM-DD date strings)
 */

export const formatLocalDate = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateStr: string): Date => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        return new Date(dateStr);
    }
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
};

export const calculateNextDate = (currentDateStr: string, frequency: string): string => {
    const date = parseLocalDate(currentDateStr);

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly': {
            const originalDay = date.getDate();
            date.setMonth(date.getMonth() + 1);
            // Handle month end overflow (e.g., Jan 31 -> Feb 28/29 instead of overflowing into March)
            if (date.getDate() !== originalDay) {
                date.setDate(0); // Roll back to last day of previous month
            }
            break;
        }
        case 'yearly': {
            const originalDay = date.getDate();
            date.setFullYear(date.getFullYear() + 1);
            if (date.getDate() !== originalDay) {
                date.setDate(0);
            }
            break;
        }
    }

    return formatLocalDate(date);
};
