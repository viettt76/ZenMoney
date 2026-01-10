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
    async addTransaction(amount: number, categoryId: number, date: string, note: string, type: string): Promise<number> {
        try {
            const result = await executeQuery(
                'INSERT INTO transactions (amount, category_id, date, note, type) VALUES (?, ?, ?, ?, ?)',
                [amount ?? null, categoryId ?? null, date ?? null, note ?? null, type ?? null]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    // Update transaction
    async updateTransaction(id: number, amount: number, categoryId: number, date: string, note: string): Promise<boolean> {
        try {
            // Fetch category type
            const result = await getFirstRow('SELECT type FROM categories WHERE id = ?', [categoryId ?? null]);
            const type = result ? result.type : 'expense';

            await executeQuery(
                'UPDATE transactions SET amount = ?, category_id = ?, date = ?, note = ?, type = ? WHERE id = ?',
                [amount ?? null, categoryId ?? null, date ?? null, note ?? null, type ?? null, id ?? null]
            );
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
    async searchTransactions(filters: { startDate?: string; endDate?: string; type?: string; categoryId?: number; limit?: number }): Promise<Transaction[]> {
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
}

export default new TransactionService();
