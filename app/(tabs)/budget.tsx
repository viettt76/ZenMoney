import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSettings } from '@/context/SettingsContext';
import CategoryService from '@/services/CategoryService';
import TransactionService from '@/services/TransactionService';
import { Category, CategorySummary } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, ProgressBar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BudgetCategory {
    id: number;
    name: string;
    icon: string;
    color: string;
    budget_limit: number;
    spent: number;
}

export default function BudgetScreen() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { formatMoney } = useSettings();
    const insets = useSafeAreaInsets();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalLimit, setTotalLimit] = useState(0);

    const loadData = useCallback(async () => {
        try {
            // 1. Get all categories
            const allCategories: Category[] = await CategoryService.getAllCategories();
            // Filter only expense categories
            const expenseCategories = allCategories.filter(
                (c) => c.type === 'expense'
            );

            // 2. Get expenses for this month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            // Get summary by category for this month
            // We need to map "Spent" to each category
            const expenses: CategorySummary[] = await TransactionService.getSummaryByCategory(startDate, endDate, 'expense');

            // 3. Merge data
            let totalSpentCalc = 0;
            let totalLimitCalc = 0;

            const mergedData = expenseCategories.map((cat: Category) => {
                const spending = expenses.find((e) => e.id === cat.id); // Assuming getSummaryByCategory returns `id` as `category_id` now
                const spent = spending ? spending.total : 0;

                totalSpentCalc += spent;
                totalLimitCalc += cat.budget_limit;

                return {
                    ...cat,
                    spent,
                };
            });

            // Sort Logic:
            // 1. Items WITH budget limit come first, sorted by % used DESC (Critical first)
            // 2. Items WITHOUT budget limit come after, sorted by Amount spent DESC (Big spenders first)
            mergedData.sort((a, b) => {
                const hasLimitA = a.budget_limit > 0;
                const hasLimitB = b.budget_limit > 0;

                if (hasLimitA && hasLimitB) {
                    // Both have limit: Sort by % used DESC
                    const percentA = a.spent / a.budget_limit;
                    const percentB = b.spent / b.budget_limit;
                    return percentB - percentA;
                } else if (!hasLimitA && !hasLimitB) {
                    // Neither has limit: Sort by Spent Amount DESC
                    return b.spent - a.spent;
                } else {
                    // Prioritize items WITH limit
                    return hasLimitA ? -1 : 1;
                }
            });

            setBudgetCategories(mergedData);
            setTotalSpent(totalSpentCalc);
            setTotalLimit(totalLimitCalc);

        } catch (error) {
            console.error(error);
        }
    }, [currentDate]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Refresh when month changes
    React.useEffect(() => {
        loadData();
    }, [currentDate, loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
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
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={styles.monthNav}>
                    <IconButton icon="chevron-left" onPress={handlePrevMonth} size={24} />
                    <Text style={styles.monthTitle}>{formatMonth(currentDate)}</Text>
                    <IconButton icon="chevron-right" onPress={handleNextMonth} size={24} />
                </View>

                <View style={styles.summaryContainer}>
                    <View>
                        <Text style={styles.label}>{t('spent')}</Text>
                        <Text style={styles.totalText}>{formatMoney(totalSpent)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View>
                        <Text style={styles.label}>{t('budget')}</Text>
                        <Text style={styles.totalText}>{formatMoney(totalLimit)}</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.content}
            >
                {budgetCategories.map((item) => {
                    const hasLimit = item.budget_limit > 0;
                    const percent = hasLimit ? item.spent / item.budget_limit : 0;
                    const remaining = item.budget_limit - item.spent;
                    let barColor = '#4CAF50'; // Green
                    if (percent > 1) barColor = '#F44336'; // Red
                    else if (percent > 0.8) barColor = '#FF9800'; // Orange

                    return (
                        <Card key={item.id} style={styles.card} onPress={() => router.push(`/history?categoryId=${item.id}`)}>
                            <Card.Content>
                                <View style={styles.cardHeader}>
                                    <View style={styles.catInfo}>
                                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                            <IconSymbol name={item.icon as any} size={20} color="white" />
                                        </View>
                                        <Text style={styles.catName}>{item.name}</Text>
                                    </View>
                                    <View style={styles.percentBadge}>
                                        {hasLimit && (
                                            <Text style={[styles.percentText, { color: barColor }]}>
                                                {(percent * 100).toFixed(0)}%
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {hasLimit ? (
                                    <>
                                        <View style={styles.progressContainer}>
                                            <ProgressBar progress={percent > 1 ? 1 : percent} color={barColor} style={styles.progressBar} />
                                        </View>

                                        <View style={styles.detailsRow}>
                                            <Text style={styles.spentText}>
                                                {formatMoney(item.spent)} / {formatMoney(item.budget_limit)}
                                            </Text>
                                            <Text style={[styles.remainingText, { color: remaining < 0 ? '#F44336' : '#757575' }]}>
                                                {remaining < 0 ? t('over_budget') : t('remaining')}: {formatMoney(Math.abs(remaining))}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.detailsSingle}>
                                        <Text style={styles.spentTextLarge}>
                                            {t('spent')}: {formatMoney(item.spent)}
                                        </Text>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    );
                })}

                {budgetCategories.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>{t('no_transactions')}</Text>
                        <Text style={styles.emptySubText}>{t('budget_empty_desc')}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingBottom: 16,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 0,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 10,
    },
    label: {
        fontSize: 12,
        color: '#757575',
        textAlign: 'center',
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#212121',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#E0E0E0',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: 'white',
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    catInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    catName: {
        fontSize: 16,
        fontWeight: '500',
    },
    percentBadge: {
        // backgroundColor: '#F5F5F5',
        // paddingHorizontal: 8,
        // paddingVertical: 2,
        // borderRadius: 12,
    },
    percentText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressContainer: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spentText: {
        fontSize: 12,
        color: '#757575',
    },
    remainingText: {
        fontSize: 12,
        fontWeight: '500',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#757575',
        marginBottom: 4,
    },
    emptySubText: {
        fontSize: 12,
        color: '#9E9E9E',
    },
    detailsSingle: {
        marginTop: 4,
    },
    spentTextLarge: {
        fontSize: 16,
        color: '#424242',
        fontWeight: '500',
    }
});
