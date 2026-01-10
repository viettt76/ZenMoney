import { useSettings } from '@/context/SettingsContext';
import RecurringService from '@/services/RecurringService';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Card, FAB, IconButton, Text } from 'react-native-paper';

export default function RecurringTrafficScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const data = await RecurringService.getAllRecurringTransactions();
            setItems(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            t('stop_recurring'),
            t('stop_recurring_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('ok'),
                    style: 'destructive',
                    onPress: async () => {
                        await RecurringService.deleteRecurringTransaction(id);
                        loadData();
                    }
                },
            ]
        );
    };

    const { formatMoney } = useSettings();

    const getFrequencyLabel = (freq: string) => {
        return t(freq);
    };

    const formatCurrency = (amount: number) => {
        return formatMoney(amount);
    };

    const renderItem = ({ item }: { item: any }) => {
        const isActive = item.is_active === 1;

        return (
            <Card style={[styles.card, !isActive && styles.inactiveCard]}>
                <Card.Content style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: item.category_color, opacity: isActive ? 1 : 0.6 }]}>
                        <IconButton icon={item.category_icon || 'cash'} iconColor="white" size={24} />
                    </View>
                    <View style={styles.info}>
                        <View style={styles.mainInfoRow}>
                            <View style={styles.textGroup}>
                                <Text style={[styles.amount, !isActive && styles.inactiveText]} numberOfLines={1}>
                                    {formatCurrency(item.amount)}
                                </Text>
                                <Text style={styles.category}>{item.category_name}</Text>
                            </View>
                            <View style={styles.actions}>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    style={styles.actionIcon}
                                    onPress={() => router.push(`/add-transaction?recurringId=${item.id}`)}
                                />
                                <IconButton
                                    icon="delete-outline"
                                    iconColor="#F44336"
                                    size={20}
                                    style={styles.actionIcon}
                                    onPress={() => handleDelete(item.id)}
                                />
                            </View>
                        </View>
                        <View style={styles.metaRow}>
                            <View style={styles.customChip}>
                                <Text style={styles.chipText}>{getFrequencyLabel(item.frequency)}</Text>
                            </View>
                            {!isActive && (
                                <View style={[styles.customChip, styles.inactiveChip]}>
                                    <Text style={styles.chipText}>{t('inactive')}</Text>
                                </View>
                            )}
                            <Text style={[styles.nextDate, !isActive && styles.inactiveText]} numberOfLines={1}>
                                {t('due_date')}: {item.next_date}
                            </Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: t('recurring_transactions'),
                }}
            />
            <FlatList
                data={items}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('no_transactions')}</Text>
                    </View>
                }
            />
            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/add-transaction?isRecurring=true')}
                label={t('add_transaction')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    card: {
        marginBottom: 12,
        borderRadius: 12,
        elevation: 2,
        backgroundColor: 'white',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#6200ee',
    },
    list: {
        padding: 16,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    mainInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textGroup: {
        flex: 1,
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212121',
    },
    category: {
        fontSize: 14,
        color: '#757575',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 8,
        flexWrap: 'wrap',
    },
    customChip: {
        backgroundColor: '#E1BEE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    chipText: {
        fontSize: 10,
        color: '#6A1B9A',
        fontWeight: 'bold',
        includeFontPadding: false,
    },
    inactiveChip: {
        backgroundColor: '#FFCDD2',
    },
    nextDate: {
        fontSize: 12,
        color: '#6200ee',
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        margin: 0,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9e9e9e',
    },
    inactiveCard: {
        backgroundColor: '#F5F5F5',
        elevation: 0,
        opacity: 0.8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    inactiveText: {
        color: '#9E9E9E',
    },
});
