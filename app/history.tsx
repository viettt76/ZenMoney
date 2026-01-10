import TransactionItem from '@/components/TransactionItem';
import { useSettings } from '@/context/SettingsContext';
import TransactionService from '@/services/TransactionService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Modal, Portal, Provider, SegmentedButtons, Text, TextInput } from 'react-native-paper';

export default function HistoryScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { categoryId } = useLocalSearchParams();
    const { language } = useSettings();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [visible, setVisible] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('all');

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const loadTransactions = React.useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (type !== 'all') filters.type = type;
            if (categoryId) filters.categoryId = Number(categoryId);
            filters.limit = 100;

            const data = await TransactionService.searchTransactions(filters);
            setTransactions(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, type, categoryId]);

    useFocusEffect(
        React.useCallback(() => {
            loadTransactions();
        }, [loadTransactions])
    );

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setType('all');
        setVisible(false);
        loadTransactions();
    };

    const applyFilters = () => {
        setVisible(false);
        loadTransactions();
    };

    const formatDate = (isoDate: string) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        if (language === 'vi') {
            return `${day}/${month}/${year}`;
        } else {
            return `${month}/${day}/${year}`;
        }
    };

    const onStartDateChange = (event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <Provider>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: t('transaction_history'),
                        headerRight: () => (
                            <IconButton icon="filter-variant" onPress={() => setVisible(true)} />
                        )
                    }}
                />

                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TransactionItem
                            transaction={item}
                            onPress={() => router.push(`/add-transaction?id=${item.id}`)}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.centerContainer}>
                                <Text style={styles.emptyText}>{t('no_transactions')}</Text>
                            </View>
                        ) : null
                    }
                />

                {loading && (
                    <View style={[styles.centerContainer, StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                        <ActivityIndicator size="large" color="#6200ee" />
                    </View>
                )}

                <Portal>
                    <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
                        <Text style={styles.modalTitle}>{t('filters')}</Text>

                        <Text style={styles.label}>{t('date_range')}</Text>
                        <View style={styles.row}>
                            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={{ flex: 1, marginRight: 8 }}>
                                <View pointerEvents="none">
                                    <TextInput
                                        label={t('start_date')}
                                        value={formatDate(startDate)}
                                        style={styles.input}
                                        mode="outlined"
                                        editable={false}
                                        right={<TextInput.Icon icon="calendar" />}
                                    />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={{ flex: 1 }}>
                                <View pointerEvents="none">
                                    <TextInput
                                        label={t('end_date')}
                                        value={formatDate(endDate)}
                                        style={styles.input}
                                        mode="outlined"
                                        editable={false}
                                        right={<TextInput.Icon icon="calendar" />}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate ? new Date(startDate) : new Date()}
                                mode="date"
                                display="default"
                                onChange={onStartDateChange}
                            />
                        )}

                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate ? new Date(endDate) : new Date()}
                                mode="date"
                                display="default"
                                onChange={onEndDateChange}
                            />
                        )}

                        <Text style={styles.label}>{t('all_types')}</Text>
                        <SegmentedButtons
                            value={type}
                            onValueChange={setType}
                            buttons={[
                                { value: 'all', label: t('all') },
                                { value: 'income', label: t('income') },
                                { value: 'expense', label: t('expense') },
                            ]}
                            style={styles.segmented}
                        />

                        <View style={styles.buttonRow}>
                            <Button onPress={resetFilters} style={styles.button}>
                                {t('reset')}
                            </Button>
                            <Button mode="contained" onPress={applyFilters} style={styles.button}>
                                {t('apply')}
                            </Button>
                        </View>
                    </Modal>
                </Portal>
            </View>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    list: {
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: '#757575',
        fontSize: 16,
    },
    modal: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: 'white',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    segmented: {
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        marginLeft: 8,
    }
});
