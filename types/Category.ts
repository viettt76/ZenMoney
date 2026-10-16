export interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
    icon: string;
    color: string;
    budget_limit: number;
    created_at?: string;
    updated_at?: string;
}

export interface CategorySummary {
    id: number;
    name: string;
    color: string;
    icon: string;
    total: number;
    count: number;
}
