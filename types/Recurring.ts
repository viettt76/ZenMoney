export interface RecurringTransaction {
    id: number;
    amount: number;
    category_id: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date: string;
    next_date: string;
    note?: string;
    type: 'income' | 'expense';
    payment_method?: 'cash' | 'e-wallet';
    is_active: number;
    created_at?: string;
    updated_at?: string;
    // Joined fields
    category_name?: string;
    category_color?: string;
    category_icon?: string;
}
