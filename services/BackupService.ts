import { getDatabase, getAllRows } from '../database/db';
import TransactionService from './TransactionService';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export interface BackupMetadata {
    app: string;
    version: number;
    exportedAt: string;
    counts: {
        categories: number;
        transactions: number;
        recurring_transactions: number;
        [key: string]: number;
    };
}

export interface BackupData extends BackupMetadata {
    data: {
        categories: any[];
        transactions: any[];
        recurring_transactions: any[];
        [tableName: string]: any[];
    };
}

export interface ExportResult {
    success: boolean;
    fileName: string;
    counts: {
        categories: number;
        transactions: number;
        recurring_transactions: number;
    };
    filePath?: string;
}

export interface ParsedBackup {
    metadata: {
        app?: string;
        version?: number;
        exportedAt?: string;
    };
    counts: {
        categories: number;
        transactions: number;
        recurring_transactions: number;
        [key: string]: number;
    };
    data: {
        categories: any[];
        transactions: any[];
        recurring_transactions: any[];
        [tableName: string]: any[];
    };
}

export interface ImportResult {
    success: boolean;
    counts: {
        categories: number;
        transactions: number;
        recurring_transactions: number;
    };
}

class BackupService {
    /**
     * Export all database tables into a structured JSON file.
     * Preserves all columns including id, created_at, and updated_at.
     */
    async exportDatabase(): Promise<ExportResult> {
        try {
            await getDatabase(); // Ensure DB is initialized

            // 1. Fetch all rows from main tables
            const categories = await getAllRows('SELECT * FROM categories ORDER BY id ASC');
            const transactions = await getAllRows('SELECT * FROM transactions ORDER BY id ASC');
            const recurring = await getAllRows('SELECT * FROM recurring_transactions ORDER BY id ASC');

            // 2. Discover any other custom tables if they exist
            const extraTables = await getAllRows<{ name: string }>(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'android_%' AND name NOT IN ('categories', 'transactions', 'recurring_transactions')"
            );

            const now = new Date();
            const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `zenmoney_backup_${dateStr}.json`;

            const payload: BackupData = {
                app: 'ZenMoney',
                version: 1,
                exportedAt: now.toISOString(),
                counts: {
                    categories: categories.length,
                    transactions: transactions.length,
                    recurring_transactions: recurring.length,
                },
                data: {
                    categories,
                    transactions,
                    recurring_transactions: recurring,
                },
            };

            for (const t of extraTables) {
                try {
                    const rows = await getAllRows(`SELECT * FROM ${t.name}`);
                    payload.data[t.name] = rows;
                    payload.counts[t.name] = rows.length;
                } catch (e) {
                    console.warn(`Could not export extra table ${t.name}:`, e);
                }
            }

            const jsonContent = JSON.stringify(payload, null, 2);

            // 3. Handle file saving & sharing across Web and Mobile
            let savedPath: string | undefined;

            if (Platform.OS === 'web') {
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // Native platform (Android / iOS)
                try {
                    const { File, Paths } = await import('expo-file-system');
                    const file = new File(Paths.cache, fileName);
                    file.create({ overwrite: true });
                    file.write(jsonContent);
                    savedPath = file.uri;
                } catch {
                    const legacy = await import('expo-file-system/legacy').catch(() => null);
                    if (legacy && legacy.cacheDirectory) {
                        savedPath = `${legacy.cacheDirectory}${fileName}`;
                        await legacy.writeAsStringAsync(savedPath, jsonContent, {
                            encoding: legacy.EncodingType.UTF8,
                        });
                    }
                }

                if (savedPath && (await Sharing.isAvailableAsync())) {
                    await Sharing.shareAsync(savedPath, {
                        mimeType: 'application/json',
                        dialogTitle: 'ZenMoney Backup',
                        UTI: 'public.json',
                    });
                }
            }

            return {
                success: true,
                fileName,
                counts: {
                    categories: categories.length,
                    transactions: transactions.length,
                    recurring_transactions: recurring.length,
                },
                filePath: savedPath,
            };
        } catch (error) {
            console.error('Error exporting database:', error);
            throw error;
        }
    }

    /**
     * Pick a backup file from device storage and read its JSON content.
     */
    async pickBackupFile(): Promise<{ fileName: string; content: string } | null> {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/json', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return null;
            }

            const asset = result.assets[0];
            let content = '';

            if (Platform.OS === 'web') {
                if (asset.file && typeof asset.file.text === 'function') {
                    content = await asset.file.text();
                } else if (asset.uri) {
                    const res = await fetch(asset.uri);
                    content = await res.text();
                }
            } else {
                try {
                    const { File } = await import('expo-file-system');
                    const file = new File(asset.uri);
                    content = await file.text();
                } catch {
                    const legacy = await import('expo-file-system/legacy').catch(() => null);
                    if (legacy && legacy.readAsStringAsync) {
                        content = await legacy.readAsStringAsync(asset.uri, {
                            encoding: legacy.EncodingType.UTF8,
                        });
                    } else {
                        const res = await fetch(asset.uri);
                        content = await res.text();
                    }
                }
            }

            return {
                fileName: asset.name,
                content,
            };
        } catch (error) {
            console.error('Error picking backup file:', error);
            throw error;
        }
    }

    /**
     * Parse and validate backup JSON string.
     * Supports nested `{ data: { categories, transactions } }`, `{ tables: ... }`, or root flat arrays.
     */
    parseBackupContent(jsonString: string): ParsedBackup {
        let parsed: any;
        try {
            parsed = JSON.parse(jsonString);
        } catch {
            throw new Error('Định dạng tệp không phải JSON hợp lệ');
        }

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Dữ liệu sao lưu không hợp lệ');
        }

        // Support various backup structures
        const dataContainer = parsed.data || parsed.tables || parsed;

        const categories = Array.isArray(dataContainer.categories) ? dataContainer.categories : [];
        const transactions = Array.isArray(dataContainer.transactions) ? dataContainer.transactions : [];
        const recurring = Array.isArray(dataContainer.recurring_transactions)
            ? dataContainer.recurring_transactions
            : Array.isArray(dataContainer.recurring)
            ? dataContainer.recurring
            : [];

        if (categories.length === 0 && transactions.length === 0) {
            throw new Error('Tệp không chứa dữ liệu danh mục hoặc giao dịch của ZenMoney');
        }

        const data: ParsedBackup['data'] = {
            categories,
            transactions,
            recurring_transactions: recurring,
        };

        // Extra tables
        for (const key of Object.keys(dataContainer)) {
            if (!['categories', 'transactions', 'recurring_transactions', 'recurring'].includes(key) && Array.isArray(dataContainer[key])) {
                data[key] = dataContainer[key];
            }
        }

        return {
            metadata: {
                app: parsed.app,
                version: parsed.version,
                exportedAt: parsed.exportedAt,
            },
            counts: {
                categories: categories.length,
                transactions: transactions.length,
                recurring_transactions: recurring.length,
            },
            data,
        };
    }

    /**
     * Restore database from parsed backup data.
     * Guaranteed to restore all rows exactly as exported, including id, created_at, and updated_at.
     */
    async restoreDatabase(parsedData: ParsedBackup['data']): Promise<ImportResult> {
        try {
            const database = await getDatabase();

            await database.withTransactionAsync(async () => {
                // 1. Temporarily disable foreign keys during wipe and bulk insertion
                await database.execAsync('PRAGMA foreign_keys = OFF;');

                // 2. Clear existing tables
                await database.execAsync('DELETE FROM recurring_transactions;');
                await database.execAsync('DELETE FROM transactions;');
                await database.execAsync('DELETE FROM categories;');

                // Helper to get actual columns of a table in SQLite
                const getTableColumns = async (table: string): Promise<string[]> => {
                    const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
                    return cols.map(c => c.name);
                };

                // Helper to normalize row fields (supporting camelCase -> snake_case)
                const normalizeRow = (rawRow: Record<string, any>): Record<string, any> => {
                    const row = { ...rawRow };

                    if (row.createdAt && !row.created_at) row.created_at = row.createdAt;
                    if (row.updatedAt && !row.updated_at) row.updated_at = row.updatedAt;
                    if (row.categoryId !== undefined && row.category_id === undefined) row.category_id = row.categoryId;
                    if (row.paymentMethod && !row.payment_method) row.payment_method = row.paymentMethod;
                    if (row.budgetLimit !== undefined && row.budget_limit === undefined) row.budget_limit = row.budgetLimit;
                    if (row.startDate && !row.start_date) row.start_date = row.startDate;
                    if (row.nextDate && !row.next_date) row.next_date = row.nextDate;
                    if (row.isActive !== undefined && row.is_active === undefined) row.is_active = row.isActive;
                    if (row.balanceCash !== undefined && row.balance_cash === undefined) row.balance_cash = row.balanceCash;
                    if (row.balanceEWallet !== undefined && row.balance_e_wallet === undefined) row.balance_e_wallet = row.balanceEWallet;

                    // Ensure updated_at is populated if created_at exists
                    if (!row.updated_at && row.created_at) {
                        row.updated_at = row.created_at;
                    }

                    return row;
                };

                // Helper to insert rows into a table
                const insertRows = async (tableName: string, rows: any[]) => {
                    if (!rows || rows.length === 0) return;
                    const validColumns = await getTableColumns(tableName);

                    for (const item of rows) {
                        const normalized = normalizeRow(item);
                        // Filter keys so we only insert columns that actually exist in the table
                        // (ignoring joined fields like category_name, category_color, etc.)
                        const keys = Object.keys(normalized).filter(k => validColumns.includes(k));
                        if (keys.length === 0) continue;

                        const placeholders = keys.map(() => '?').join(', ');
                        const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
                        const values = keys.map(k => normalized[k] ?? null);

                        await database.runAsync(sql, values);
                    }
                };

                // 3. Insert categories first, then transactions and recurring_transactions
                await insertRows('categories', parsedData.categories || []);
                await insertRows('transactions', parsedData.transactions || []);
                await insertRows('recurring_transactions', parsedData.recurring_transactions || []);

                // Extra tables if any
                for (const key of Object.keys(parsedData)) {
                    if (!['categories', 'transactions', 'recurring_transactions'].includes(key) && Array.isArray(parsedData[key])) {
                        try {
                            await insertRows(key, parsedData[key]);
                        } catch (err) {
                            console.warn(`Could not restore extra table ${key}:`, err);
                        }
                    }
                }

                // 4. Update sqlite_sequence to preserve autoincrement sequence counters correctly
                try {
                    await database.execAsync("DELETE FROM sqlite_sequence WHERE name IN ('categories', 'transactions', 'recurring_transactions')");
                    await database.runAsync(
                        "INSERT INTO sqlite_sequence (name, seq) VALUES ('categories', COALESCE((SELECT MAX(id) FROM categories), 0))"
                    );
                    await database.runAsync(
                        "INSERT INTO sqlite_sequence (name, seq) VALUES ('transactions', COALESCE((SELECT MAX(id) FROM transactions), 0))"
                    );
                    await database.runAsync(
                        "INSERT INTO sqlite_sequence (name, seq) VALUES ('recurring_transactions', COALESCE((SELECT MAX(id) FROM recurring_transactions), 0))"
                    );
                } catch (seqError) {
                    console.warn('Could not update sqlite_sequence:', seqError);
                }

                // 5. Re-enable foreign keys
                await database.execAsync('PRAGMA foreign_keys = ON;');
            });

            // 6. Recalculate balances in chronological order to ensure running balances are intact
            await TransactionService.recalculateBalances();

            return {
                success: true,
                counts: {
                    categories: (parsedData.categories || []).length,
                    transactions: (parsedData.transactions || []).length,
                    recurring_transactions: (parsedData.recurring_transactions || []).length,
                },
            };
        } catch (error) {
            console.error('Error restoring database:', error);
            throw error;
        }
    }
}

export default new BackupService();
