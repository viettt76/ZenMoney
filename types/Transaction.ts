export interface Transaction {
    id: number;
    amount: number;
    category_id: number;
    date: string; // ISO YYYY-MM-DD
    note: string;
    type: 'income' | 'expense';
    created_at?: string;
    // Joined fields
    category_name?: string;
    category_color?: string;
    category_icon?: string;
}

export interface TransactionSummary {
    income: number;
    expense: number;
    balance: number;
}
