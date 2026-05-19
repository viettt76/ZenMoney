import { CategorySummary, Transaction, TransactionSummary } from '@/types';
import { executeQuery, getAllRows, getFirstRow } from '../database/db';

class TransactionService {
    // Get all transactions
    async getAllTransactions(limit: number = 100): Promise<Transaction[]> {
        try {
            const transactions = await getAllRows(
                `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         ORDER BY t.date DESC, t.created_at DESC
         LIMIT ?`,
                [limit ?? 100]
            );
            return transactions as Transaction[];
        } catch (error) {
            console.error('Error getting transactions:', error);
            throw error;
        }
    }

    // Get transactions by date range
    async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
        try {
            const transactions = await getAllRows(
                `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.date BETWEEN ? AND ?
         ORDER BY t.date DESC, t.created_at DESC`,
                [startDate ?? null, endDate ?? null]
            );
            return transactions as Transaction[];
        } catch (error) {
            console.error('Error getting transactions by date range:', error);
            throw error;
        }
    }

    // Get transactions by month
    async getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
            return await this.getTransactionsByDateRange(startDate, endDate);
        } catch (error) {
            console.error('Error getting transactions by month:', error);
            throw error;
        }
    }

    // Get transactions by category
    async getTransactionsByCategory(categoryId: number): Promise<Transaction[]> {
        try {
            const transactions = await getAllRows(
                `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.category_id = ?
         ORDER BY t.date DESC, t.created_at DESC`,
                [categoryId ?? null]
            );
            return transactions as Transaction[];
        } catch (error) {
            console.error('Error getting transactions by category:', error);
            throw error;
        }
    }

    // Add new transaction
    async addTransaction(amount: number, categoryId: number | null, date: string, note: string, type: string, paymentMethod: string = 'e-wallet'): Promise<number> {
        try {
            const result = await executeQuery(
                'INSERT INTO transactions (amount, category_id, date, note, type, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
                [amount ?? null, categoryId ?? null, date ?? null, note ?? null, type ?? null, paymentMethod ?? 'e-wallet']
            );
            const newId = result.lastInsertRowId;
            await this.recalculateBalances();
            return newId;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    // Add transfer between sources
    async addTransfer(amount: number, fromMethod: 'cash' | 'e-wallet', date: string, note: string): Promise<number> {
        try {
            const result = await executeQuery(
                'INSERT INTO transactions (amount, category_id, date, note, type, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
                [amount ?? null, null, date ?? null, note ?? null, 'transfer', fromMethod]
            );
            const newId = result.lastInsertRowId;
            await this.recalculateBalances();
            return newId;
        } catch (error) {
            console.error('Error adding transfer:', error);
            throw error;
        }
    }

    // Update transaction
    async updateTransaction(id: number, amount: number, categoryId: number | null, date: string, note: string, paymentMethod: string = 'e-wallet'): Promise<boolean> {
        try {
            let type = 'expense';
            if (categoryId) {
                const result = await getFirstRow('SELECT type FROM categories WHERE id = ?', [categoryId]);
                type = result ? result.type : 'expense';
            } else {
                // If no category, might be a transfer
                const tx = await this.getTransactionById(id);
                type = tx?.type || 'expense';
            }

            await executeQuery(
                'UPDATE transactions SET amount = ?, category_id = ?, date = ?, note = ?, type = ?, payment_method = ? WHERE id = ?',
                [amount ?? null, categoryId ?? null, date ?? null, note ?? null, type ?? null, paymentMethod ?? 'e-wallet', id ?? null]
            );
            await this.recalculateBalances();
            return true;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    // Delete transaction
    async deleteTransaction(id: number): Promise<boolean> {
        try {
            await executeQuery('DELETE FROM transactions WHERE id = ?', [id ?? null]);
            await this.recalculateBalances();
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    // Get summary statistics
    async getSummary(startDate: string, endDate: string): Promise<TransactionSummary> {
        try {
            const income = await getFirstRow(
                `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE type = 'income' AND date BETWEEN ? AND ?`,
                [startDate ?? null, endDate ?? null]
            );

            const expense = await getFirstRow(
                `SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE type = 'expense' AND date BETWEEN ? AND ?`,
                [startDate ?? null, endDate ?? null]
            );

            return {
                income: income.total,
                expense: expense.total,
                balance: income.total - expense.total,
            };
        } catch (error) {
            console.error('Error getting summary:', error);
            throw error;
        }
    }

    // Get summary by category
    async getSummaryByCategory(startDate: string, endDate: string, type: string): Promise<CategorySummary[]> {
        try {
            const summary = await getAllRows(
                `SELECT t.category_id as id, c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(t.id) as count
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.type = ? AND t.date BETWEEN ? AND ?
         GROUP BY t.category_id
         ORDER BY total DESC`,
                [type ?? null, startDate ?? null, endDate ?? null]
            );
            return summary as CategorySummary[];
        } catch (error) {
            console.error('Error getting summary by category:', error);
            throw error;
        }
    }

    // Get transaction by ID
    async getTransactionById(id: number): Promise<Transaction | null> {
        try {
            const transaction = await getFirstRow(
                `SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.id = ?`,
                [id ?? null]
            );
            return transaction as Transaction;
        } catch (error) {
            console.error('Error getting transaction by id:', error);
            throw error;
        }
    }

    // Search transactions with filters
    async searchTransactions(filters: { startDate?: string; endDate?: string; type?: string; categoryId?: number; paymentMethod?: string; limit?: number }): Promise<Transaction[]> {
        try {
            let query = `
                SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
                FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE 1=1
            `;
            const params: any[] = [];

            if (filters.startDate) {
                query += ' AND t.date >= ?';
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                query += ' AND t.date <= ?';
                params.push(filters.endDate);
            }
            if (filters.type && filters.type !== 'all') {
                query += ' AND t.type = ?';
                params.push(filters.type);
            }
            if (filters.categoryId) {
                query += ' AND t.category_id = ?';
                params.push(filters.categoryId);
            }
            if (filters.paymentMethod && filters.paymentMethod !== 'all') {
                query += ' AND t.payment_method = ?';
                params.push(filters.paymentMethod);
            }

            query += ' ORDER BY t.date DESC, t.created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            } else {
                query += ' LIMIT 100'; // Default limit
            }

            const transactions = await getAllRows(query, params);
            return transactions as Transaction[];
        } catch (error) {
            console.error('Error searching transactions:', error);
            throw error;
        }
    }

    // Get total balance (all time)
    async getTotalBalance(): Promise<number> {
        try {
            const income = await getFirstRow(
                "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'"
            );
            const expense = await getFirstRow(
                "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'"
            );
            return income.total - expense.total;
        } catch (error) {
            console.error('Error getting total balance:', error);
            throw error;
        }
    }

    // Get balance broken down by payment method
    async getBalanceByPaymentMethod(): Promise<{ cash: number; eWallet: number }> {
        try {
            const rows = await getAllRows(
                `SELECT type, payment_method, SUM(amount) as total 
                 FROM transactions 
                 GROUP BY type, payment_method`
            );

            let cash = 0;
            let eWallet = 0;

            rows.forEach((row: any) => {
                const amount = row.total;
                const method = row.payment_method || 'e-wallet';

                if (row.type === 'income') {
                    if (method === 'cash') cash += amount;
                    else eWallet += amount;
                } else if (row.type === 'expense') {
                    if (method === 'cash') cash -= amount;
                    else eWallet -= amount;
                } else if (row.type === 'transfer') {
                    if (method === 'cash') {
                        cash -= amount;
                        eWallet += amount;
                    } else {
                        eWallet -= amount;
                        cash += amount;
                    }
                }
            });

            return { cash, eWallet };
        } catch (error) {
            console.error('Error getting balance by payment method:', error);
            throw error;
        }
    }

    // Recalculate all balances in chronological order
    async recalculateBalances() {
        try {
            const transactions = await getAllRows(
                'SELECT * FROM transactions ORDER BY date ASC, id ASC'
            );

            let currentCash = 0;
            let currentEWallet = 0;

            for (const tx of transactions) {
                const amount = tx.amount;
                const method = tx.payment_method || 'e-wallet';

                if (tx.type === 'income') {
                    if (method === 'cash') currentCash += amount;
                    else currentEWallet += amount;
                } else if (tx.type === 'expense') {
                    if (method === 'cash') currentCash -= amount;
                    else currentEWallet -= amount;
                } else if (tx.type === 'transfer') {
                    if (method === 'cash') {
                        currentCash -= amount;
                        currentEWallet += amount;
                    } else {
                        currentEWallet -= amount;
                        currentCash += amount;
                    }
                }

                await executeQuery(
                    'UPDATE transactions SET balance_cash = ?, balance_e_wallet = ? WHERE id = ?',
                    [currentCash, currentEWallet, tx.id]
                );
            }
        } catch (error) {
            console.error('Error recalculating balances:', error);
            throw error;
        }
    }
}

export default new TransactionService();
