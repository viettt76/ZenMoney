import { Category } from '@/types';
import { executeQuery, getAllRows, getFirstRow } from '../database/db';

class CategoryService {
    // Get all categories
    async getAllCategories(): Promise<Category[]> {
        try {
            const categories = await getAllRows('SELECT * FROM categories');
            // Sort by type first, then by name using Vietnamese locale
            return (categories as Category[]).sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type.localeCompare(b.type);
                }
                return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
            });
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }

    // Get categories by type
    async getCategoriesByType(type: string): Promise<Category[]> {
        try {
            const categories = await getAllRows('SELECT * FROM categories WHERE type = ?', [type ?? null]);
            // Sort by name using Vietnamese locale
            return (categories as Category[]).sort((a, b) =>
                a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
            );
        } catch (error) {
            console.error('Error getting categories by type:', error);
            throw error;
        }
    }

    // Get category by ID
    async getCategoryById(id: number): Promise<Category> {
        try {
            const category = await getFirstRow('SELECT * FROM categories WHERE id = ?', [id ?? null]);
            return category as Category;
        } catch (error) {
            console.error('Error getting category by ID:', error);
            throw error;
        }
    }

    // Add new category
    async addCategory(name: string, type: string, color: string = '#6200ee', icon: string = 'help-circle', budgetLimit: number = 0) {
        try {
            const result = await executeQuery('INSERT INTO categories (name, type, color, icon, budget_limit) VALUES (?, ?, ?, ?, ?)', [
                name ?? null,
                type ?? null,
                color ?? null,
                icon ?? null,
                budgetLimit ?? 0,
            ]);
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }

    // Update category
    async updateCategory(id: number, name: string, type: string, color: string, icon: string, budgetLimit: number) {
        try {
            await executeQuery('UPDATE categories SET name = ?, type = ?, color = ?, icon = ?, budget_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
                name ?? null,
                type ?? null,
                color ?? null,
                icon ?? null,
                budgetLimit ?? 0,
                id ?? null,
            ]);
            return true;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    // Delete category
    async deleteCategory(id: number) {
        try {
            // Check if category is being used in transactions
            const transactionCount = await getFirstRow<{ count: number }>(
                'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
                [id ?? null],
            );

            const recurringCount = await getFirstRow<{ count: number }>(
                'SELECT COUNT(*) as count FROM recurring_transactions WHERE category_id = ?',
                [id ?? null],
            );

            if ((transactionCount?.count ?? 0) > 0 || (recurringCount?.count ?? 0) > 0) {
                throw new Error('Không thể xóa danh mục đang được sử dụng');
            }

            await executeQuery('DELETE FROM categories WHERE id = ?', [id ?? null]);
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }
}

export default new CategoryService();
