export interface Transaction {
    id: number;
    amount: number;
    category_id?: number | null;
    date: string; // ISO YYYY-MM-DD
    note: string;
    type: 'income' | 'expense' | 'transfer';
    payment_method?: 'cash' | 'e-wallet';
    balance_cash?: number;
    balance_e_wallet?: number;
    created_at?: string;
    updated_at?: string;
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
