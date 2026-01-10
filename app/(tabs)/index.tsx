import TransactionItem from '@/components/TransactionItem';
import { useSettings } from '@/context/SettingsContext';
import RecurringService from '@/services/RecurringService';
import TransactionService from '@/services/TransactionService';
import { Transaction } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, FAB, IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HomeScreen = () => {
    const router = useRouter()
    const insets = useSafeAreaInsets();

    const { t, i18n } = useTranslation();
    const { formatMoney } = useSettings();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState({ income: 0, expense: 0 });
    const [totalBalance, setTotalBalance] = useState(0);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = React.useCallback(async () => {
        try {
            // Get month summary based on currentDate
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // 0-indexed
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            const summaryData = await TransactionService.getSummary(startDate, endDate);
            setSummary({ income: summaryData.income, expense: summaryData.expense });

            // Get total balance (all time)
            const balance = await TransactionService.getTotalBalance();
            setTotalBalance(balance);

            // Get recent transactions
            const transactions = await TransactionService.getAllTransactions(10);
            setRecentTransactions(transactions);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }, [currentDate]);

    const processRecurringTransactions = React.useCallback(async () => {
        try {
            await RecurringService.processDueRecurringTransactions();
        } catch (error) {
            console.error('Error processing recurring transactions:', error);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            processRecurringTransactions();
        }, [loadData, processRecurringTransactions]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        await processRecurringTransactions();
        setRefreshing(false);
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const formatMonth = (date: Date) => {
        if (i18n.language === 'vi') {
            return `${t('month_prefix')}${date.getMonth() + 1}, ${date.getFullYear()}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Summary Card */}
                <Card style={styles.summaryCard}>
                    <Card.Content>
                        {/* Month Navigation */}
                        <View style={styles.monthNav}>
                            <IconButton icon="chevron-left" onPress={handlePrevMonth} size={24} />
                            <Text style={styles.summaryTitle}>{formatMonth(currentDate)}</Text>
                            <IconButton icon="chevron-right" onPress={handleNextMonth} size={24} />
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>{t('income')}</Text>
                                <Text style={[styles.summaryAmount, styles.incomeText]}>
                                    {formatMoney(summary.income)}
                                </Text>
                            </View>

                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>{t('expense')}</Text>
                                <Text style={[styles.summaryAmount, styles.expenseText]}>
                                    {formatMoney(summary.expense)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.balanceContainer}>
                            <Text style={styles.balanceLabel}>{t('balance_total')}</Text>
                            <Text
                                style={[styles.balanceAmount, { color: totalBalance >= 0 ? '#4CAF50' : '#F44336' }]}
                            >
                                {formatMoney(totalBalance)}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('recent_transactions')}</Text>
                        <TouchableOpacity onPress={() => router.push('/history')} style={styles.viewAllButton}>
                            <Text style={styles.viewAllText}>{t('view_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    {recentTransactions.length > 0 ? (
                        recentTransactions.map((transaction) => (
                            <TransactionItem
                                key={transaction.id}
                                transaction={transaction}
                                onPress={() => router.push(`/add-transaction?id=${transaction.id}`)}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{t('no_transactions')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/add-transaction')}
                label={t('add_transaction')}
            // extended={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    summaryCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 4,
        elevation: 4,
        borderRadius: 16,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212121',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    summaryItem: {
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 4,
    },
    summaryAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    incomeText: {
        color: '#4CAF50',
    },
    expenseText: {
        color: '#F44336',
    },
    balanceContainer: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    balanceLabel: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 4,
    },
    balanceAmount: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    section: {
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212121',
    },
    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#6200ee',
    },
    viewAllText: {
        color: '#6200ee',
        fontSize: 13,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9E9E9E',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#6200ee',
    },
    scrollContent: {
        paddingBottom: 100,
    },
});

export default HomeScreen;
