import { executeQuery, getAllRows, getFirstRow } from '../database/db';
import { calculateNextDate as calcNextDate, formatLocalDate } from '../utils/date';
import i18n from '../utils/i18n';
import TransactionService from './TransactionService';

class RecurringService {
    private isProcessing = false;

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
    async addRecurringTransaction(amount: number, categoryId: number, frequency: string, startDate: string, note: string, type: string, paymentMethod: string = 'e-wallet') {
        try {
            const nextDate = this.calculateNextDate(startDate, frequency);

            const result = await executeQuery(
                `INSERT INTO recurring_transactions 
         (amount, category_id, frequency, start_date, next_date, note, type, payment_method) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [amount, categoryId, frequency, startDate, nextDate, note, type, paymentMethod ?? 'e-wallet']
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding recurring transaction:', error);
            throw error;
        }
    }

    // Update recurring transaction
    async updateRecurringTransaction(id: number, amount: number, category_id: number, frequency: string, next_date: string, note: string, type: string, is_active: number, paymentMethod: string = 'e-wallet') {
        try {
            await executeQuery(
                `UPDATE recurring_transactions 
         SET amount = ?, category_id = ?, frequency = ?, next_date = ?, note = ?, type = ?, is_active = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
                [amount, category_id, frequency, next_date, note, type, is_active, paymentMethod ?? 'e-wallet', id]
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
        return calcNextDate(currentDate, frequency);
    }

    // Process due recurring transactions (create actual transactions)
    async processDueRecurringTransactions() {
        if (this.isProcessing) {
            return 0;
        }

        this.isProcessing = true;
        try {
            const today = formatLocalDate(new Date());

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
                let iterations = 0;
                const maxIterations = 365; // Safe guard against infinite loops

                // Process all missed and due occurrences up to today
                while (currentNextDate <= today && iterations < maxIterations) {
                    const noteTag = recurring.note
                        ? `${recurring.note} ${i18n.t('recurring_tag')}`
                        : i18n.t('recurring_default_note');

                    // Idempotency check: verify if a transaction already exists for this recurring execution
                    const existing = await getFirstRow(
                        `SELECT id FROM transactions 
                         WHERE category_id = ? AND amount = ? AND date = ? AND type = ? AND note = ? AND payment_method = ?
                         LIMIT 1`,
                        [recurring.category_id, recurring.amount, currentNextDate, recurring.type, noteTag, recurring.payment_method ?? 'e-wallet']
                    );

                    if (!existing) {
                        await TransactionService.addTransaction(
                            recurring.amount,
                            recurring.category_id,
                            currentNextDate,
                            noteTag,
                            recurring.type,
                            recurring.payment_method
                        );
                        count++;
                    }

                    currentNextDate = this.calculateNextDate(currentNextDate, recurring.frequency);
                    iterations++;
                }

                // Update next_date in DB to the next upcoming occurrence
                await executeQuery(
                    'UPDATE recurring_transactions SET next_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [currentNextDate, recurring.id]
                );

                totalProcessed += count;
            }

            if (totalProcessed > 0) {
                console.log(`Processed ${totalProcessed} recurring transactions`);
            }
            return totalProcessed;
        } catch (error) {
            console.error('Error processing due recurring transactions:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    // Get upcoming recurring transactions (next 30 days)
    async getUpcomingRecurring(days: number = 30) {
        try {
            const todayStr = formatLocalDate(new Date());
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            const futureDateStr = formatLocalDate(futureDate);

            const upcoming = await getAllRows(
                `SELECT r.*, c.name as category_name, c.color as category_color, c.icon as category_icon
         FROM recurring_transactions r
         LEFT JOIN categories c ON r.category_id = c.id
         WHERE r.is_active = ? AND r.next_date BETWEEN ? AND ?
         ORDER BY r.next_date ASC`,
                [1, todayStr, futureDateStr]
            );

            return upcoming;
        } catch (error) {
            console.error('Error getting upcoming recurring transactions:', error);
            throw error;
        }
    }

}

export default new RecurringService();

