import { executeQuery, getAllRows, getFirstRow } from '../database/db';
import i18n from '../utils/i18n';
import TransactionService from './TransactionService';

class RecurringService {
    // Get all recurring transactions
    async getAllRecurringTransactions() {
        try {
            const recurring = await getAllRows(
                `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         ORDER BY r.is_active DESC, r.next_date ASC`,
                []
            );
            return recurring;
        } catch (error) {
            console.error('Error getting recurring transactions:', error);
            throw error;
        }
    }

    // Get recurring transaction by ID
    async getRecurringById(id: number) {
        try {
            const recurring = await getFirstRow(
                `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.id = ?`,
                [id]
            );
            return recurring;
        } catch (error) {
            console.error('Error getting recurring transaction by ID:', error);
            throw error;
        }
    }

    // Add new recurring transaction
    async addRecurringTransaction(amount: number, categoryId: number, frequency: string, startDate: string, note: string, type: string) {
        try {
            const nextDate = this.calculateNextDate(startDate, frequency);

            const result = await executeQuery(
                `INSERT INTO recurring_transactions 
         (amount, category_id, frequency, start_date, next_date, note, type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [amount, categoryId, frequency, startDate, nextDate, note, type]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding recurring transaction:', error);
            throw error;
        }
    }

    // Update recurring transaction
    async updateRecurringTransaction(id: number, amount: number, category_id: number, frequency: string, next_date: string, note: string, type: string, is_active: number) {
        try {
            await executeQuery(
                `UPDATE recurring_transactions 
         SET amount = ?, category_id = ?, frequency = ?, next_date = ?, note = ?, type = ?, is_active = ? 
         WHERE id = ?`,
                [amount, category_id, frequency, next_date, note, type, is_active, id]
            );
            return true;
        } catch (error) {
            console.error('Error updating recurring transaction:', error);
            throw error;
        }
    }

    // Hard delete recurring transaction
    async deleteRecurringTransaction(id: number) {
        try {
            await executeQuery(
                'DELETE FROM recurring_transactions WHERE id = ?',
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error deleting recurring transaction:', error);
            throw error;
        }
    }

    // Calculate next date based on frequency
    calculateNextDate(currentDate: string, frequency: string) {
        const date = new Date(currentDate);

        switch (frequency) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }

        return date.toISOString().split('T')[0];
    }

    // Process due recurring transactions (create actual transactions)
    async processDueRecurringTransactions() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get all active due recurring transactions
            const dueRecurring = await getAllRows(
                `SELECT * FROM recurring_transactions 
         WHERE is_active = ? AND next_date <= ?`,
                [1, today]
            );

            let totalProcessed = 0;

            for (const recurring of dueRecurring) {
                let currentNextDate = recurring.next_date;
                let count = 0;

                // Loop to catch up on missed occurrences
                while (currentNextDate <= today) {
                    await TransactionService.addTransaction(
                        recurring.amount,
                        recurring.category_id,
                        currentNextDate,
                        recurring.note ? `${recurring.note} ${i18n.t('recurring_tag')}` : i18n.t('recurring_default_note'),
                        recurring.type
                    );

                    currentNextDate = this.calculateNextDate(currentNextDate, recurring.frequency);
                    count++;
                }

                // Update next_date in DB to the latest calculated date
                await executeQuery(
                    'UPDATE recurring_transactions SET next_date = ? WHERE id = ?',
                    [currentNextDate, recurring.id]
                );

                totalProcessed += count;
            }

            if (totalProcessed > 0) {
                console.log(`Processed ${totalProcessed} recurring transactions (catch-up)`);
            }
            return totalProcessed;
        } catch (error) {
            console.error('Error processing due recurring transactions:', error);
            throw error;
        }
    }

    // Get upcoming recurring transactions (next 30 days)
    async getUpcomingRecurring(days: number = 30) {
        try {
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + days);

            const upcoming = await getAllRows(
                `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.is_active = ? AND r.next_date BETWEEN ? AND ?
         ORDER BY r.next_date ASC`,
                [1, today.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]]
            );

            return upcoming;
        } catch (error) {
            console.error('Error getting upcoming recurring transactions:', error);
            throw error;
        }
    }

}

export default new RecurringService();
