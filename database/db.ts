import * as SQLite from 'expo-sqlite';

const DB_NAME = 'zenmoney.db';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database and create tables
export const initDatabase = async () => {
    try {
        if (!db) {
            db = await SQLite.openDatabaseAsync(DB_NAME);
        }

        // Create categories table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        color TEXT DEFAULT '#6200ee',
        icon TEXT DEFAULT 'help-circle',
        budget_limit REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Migration: Add budget_limit column if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE categories ADD COLUMN budget_limit REAL DEFAULT 0');
        } catch {
            // Column likely already exists, ignore
        }

        // Migration: Add updated_at column to categories if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
            await db.execAsync('UPDATE categories SET updated_at = created_at WHERE updated_at IS NULL');
        } catch {
            // Column likely already exists, ignore
        }

        // Create transactions table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category_id INTEGER,
        date TEXT NOT NULL,
        note TEXT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
        payment_method TEXT DEFAULT 'e-wallet',
        balance_cash REAL DEFAULT 0,
        balance_e_wallet REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `);

        // Migration: Add updated_at column to transactions if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
            await db.execAsync('UPDATE transactions SET updated_at = created_at WHERE updated_at IS NULL');
        } catch {
            // Column likely already exists, ignore
        }

        // Migration: Update schema for balance and 'transfer' type
        try {
            const tableInfo: any = await getAllRows("PRAGMA table_info(transactions)");
            const hasBalance = tableInfo.some((col: any) => col.name === 'balance_cash');
            const hasTransferInCheck = false; // We can't easily check CHECK constraint via PRAGMA table_info

            // We'll recreate the table if balance column is missing. 
            // This also ensures the CHECK constraint is updated.
            if (!hasBalance) {
                await db.execAsync("ALTER TABLE transactions RENAME TO transactions_old");
                await db.execAsync(`
                    CREATE TABLE transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        amount REAL NOT NULL,
                        category_id INTEGER,
                        date TEXT NOT NULL,
                        note TEXT,
                        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
                        payment_method TEXT DEFAULT 'e-wallet',
                        balance_cash REAL DEFAULT 0,
                        balance_e_wallet REAL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (category_id) REFERENCES categories (id)
                    )
                `);

                // We need to handle cases where payment_method might not exist in old table yet
                const hasPaymentMethod = tableInfo.some((col: any) => col.name === 'payment_method');
                const columns = ["id", "amount", "category_id", "date", "note", "type", "created_at"];
                if (hasPaymentMethod) columns.push("payment_method");

                const colsStr = columns.join(", ");
                await db.execAsync(`
                    INSERT INTO transactions (${colsStr})
                    SELECT ${colsStr} FROM transactions_old
                `);
                await db.execAsync("DROP TABLE transactions_old");
                await db.execAsync("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)");
            }
        } catch (e) {
            console.error("Migration error:", e);
        }

        // Create recurring_transactions table
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        category_id INTEGER NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        start_date TEXT NOT NULL,
        next_date TEXT NOT NULL,
        note TEXT,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        payment_method TEXT DEFAULT 'e-wallet',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );
    `);

        // Migration: Add payment_method column to recurring_transactions if it doesn't exist
        try {
            await db.execAsync("ALTER TABLE recurring_transactions ADD COLUMN payment_method TEXT DEFAULT 'e-wallet'");
        } catch {
            // Column likely already exists, ignore
        }

        // Migration: Add updated_at column to recurring_transactions if it doesn't exist
        try {
            await db.execAsync('ALTER TABLE recurring_transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
            await db.execAsync('UPDATE recurring_transactions SET updated_at = created_at WHERE updated_at IS NULL');
        } catch {
            // Column likely already exists, ignore
        }

        // Create indexes for performance
        await db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
          CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
          CREATE INDEX IF NOT EXISTS idx_recurring_next_date ON recurring_transactions(next_date);
          CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active);
        `);

        console.log('Database initialized successfully');

        // Initialize default categories if none exist
        await initDefaultCategories(db!);

        return db;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
};

// Initialize default categories
const initDefaultCategories = async (database: SQLite.SQLiteDatabase) => {
    try {
        const result = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories', []);

        if (result && result.count === 0) {
            const defaultCategories = [
                // Income categories
                { name: 'Lương', type: 'income', color: '#4CAF50', icon: 'cash' },
                { name: 'Thưởng', type: 'income', color: '#8BC34A', icon: 'gift' },
                { name: 'Đầu tư', type: 'income', color: '#009688', icon: 'trending-up' },
                { name: 'Thu nhập khác', type: 'income', color: '#00BCD4', icon: 'wallet' },

                // Expense categories
                { name: 'Ăn uống', type: 'expense', color: '#FF9800', icon: 'food' },
                { name: 'Di chuyển', type: 'expense', color: '#FF5722', icon: 'car' },
                { name: 'Mua sắm', type: 'expense', color: '#E91E63', icon: 'shopping' },
                { name: 'Giải trí', type: 'expense', color: '#9C27B0', icon: 'gamepad-variant' },
                { name: 'Hóa đơn', type: 'expense', color: '#673AB7', icon: 'receipt' },
                { name: 'Sức khỏe', type: 'expense', color: '#3F51B5', icon: 'hospital' },
                { name: 'Giáo dục', type: 'expense', color: '#2196F3', icon: 'school' },
                { name: 'Chi phí khác', type: 'expense', color: '#607D8B', icon: 'dots-horizontal' },
            ];

            for (const category of defaultCategories) {
                await database.runAsync(
                    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
                    [category.name, category.type, category.color, category.icon]
                );
            }

            console.log('Default categories initialized');
        }
    } catch (error) {
        console.error('Error initializing default categories:', error);
    }
};

// Get database instance
export const getDatabase = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync(DB_NAME);
    }
    return db;
};

// Execute a query
export const executeQuery = async (query: string, params: any[] = []) => {
    const database = await getDatabase();
    return await database.runAsync(query, params);
};

// Get all rows
export const getAllRows = async <T = any>(query: string, params: any[] = []): Promise<T[]> => {
    const database = await getDatabase();
    return await database.getAllAsync<T>(query, params);
};

// Get first row
export const getFirstRow = async <T = any>(query: string, params: any[] = []): Promise<T | null> => {
    const database = await getDatabase();
    return await database.getFirstAsync<T>(query, params);
};
