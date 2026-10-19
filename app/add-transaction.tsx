import CategoryPicker from '@/components/CategoryPicker';
import { useSettings } from '@/context/SettingsContext';
import RecurringService from '@/services/RecurringService';
import TransactionService from '@/services/TransactionService';
import { Category } from '@/types';
import { formatLocalDate } from '@/utils/date';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';

export default function AddTransactionScreen() {
    const router = useRouter();
    const { id, recurringId, isRecurring: isRecurringParam } = useLocalSearchParams();
    const { t } = useTranslation();
    const { currency, language } = useSettings();

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [type, setType] = useState('expense'); // 'income' or 'expense'
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'e-wallet'>('e-wallet');

    // Core date state (ISO YYYY-MM-DD)
    const [date, setDate] = useState(formatLocalDate(new Date()));
    // Display date state for text input
    const [textDate, setTextDate] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);
    const [isInitialLoading, setIsInitialLoading] = useState(!!(id || recurringId));

    // UX: Remember last selected category for each type
    const [lastIncomeCategory, setLastIncomeCategory] = useState<Category | null>(null);
    const [lastExpenseCategory, setLastExpenseCategory] = useState<Category | null>(null);

    // Recurring specific
    const [isRecurring, setIsRecurring] = useState(isRecurringParam === 'true');
    const [frequency, setFrequency] = useState('monthly'); // daily, weekly, monthly, yearly

    const formatDate = React.useCallback((isoDate: string) => {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        if (language === 'vi') {
            return `${day}/${month}/${year}`;
        } else {
            return `${month}/${day}/${year}`;
        }
    }, [language]);

    const loadTransaction = React.useCallback(async (txId: number) => {
        try {
            const tx = await TransactionService.getTransactionById(txId);
            if (tx) {
                setAmount(tx.amount.toString());
                setNote(tx.note || '');

                setType(tx.type);
                setPaymentMethod(tx.payment_method || 'e-wallet');
                setDate(tx.date);
                setTextDate(formatDate(tx.date));
                if (tx.category_id) {
                    setSelectedCategory({
                        id: tx.category_id,
                        name: tx.category_name || '',
                        icon: tx.category_icon || 'help-circle',
                        color: tx.category_color || '#ccc',
                        type: tx.type as any,
                        budget_limit: 0
                    });
                } else {
                    setSelectedCategory(null);
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), t('error_load'));
            router.back();
        } finally {
            setIsInitialLoading(false);
        }
    }, [t, router, formatDate]);

    const loadRecurringTransaction = React.useCallback(async (rId: number) => {
        try {
            const tx = await RecurringService.getRecurringById(rId);
            if (tx) {
                setAmount(tx.amount.toString());
                setNote(tx.note || '');
                setType(tx.type);
                setPaymentMethod(tx.payment_method || 'e-wallet'); // Bug fix: load correct payment method
                setDate(tx.next_date);
                setTextDate(formatDate(tx.next_date));
                setSelectedCategory({
                    id: tx.category_id,
                    name: tx.category_name!,
                    icon: tx.category_icon!,
                    color: tx.category_color!,
                    type: tx.type as any,
                    budget_limit: 0
                });
                setIsRecurring(true);
                setFrequency(tx.frequency);
                setIsActive(tx.is_active === 1);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), t('error_load'));
            router.back();
        } finally {
            setIsInitialLoading(false);
        }
    }, [t, router, formatDate]);

    useEffect(() => {
        if (id) {
            loadTransaction(Number(id));
        } else if (recurringId) {
            loadRecurringTransaction(Number(recurringId));
        } else {
            // New transaction: initialize textDate immediately
            setTextDate(formatDate(date));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, recurringId]);

    // Update textDate when language or date changes securely
    useEffect(() => {
        setTextDate(formatDate(date));
    }, [language, date, formatDate]);

    const parseAndSetDate = (text: string) => {
        setTextDate(text);

        // Simple validation and parsing
        let parts = text.split('/');
        if (parts.length === 3) {
            let d, m, y;
            if (language === 'vi') {
                [d, m, y] = parts;
            } else {
                [m, d, y] = parts;
            }

            // Pad with 0 if needed
            if (d.length === 1) d = '0' + d;
            if (m.length === 1) m = '0' + m;

            if (y.length === 4 && !isNaN(Number(d)) && !isNaN(Number(m)) && !isNaN(Number(y))) {
                const iso = `${y}-${m}-${d}`;
                // Check if valid date
                const dateObj = new Date(iso);
                if (!isNaN(dateObj.getTime())) {
                    setDate(iso);
                }
            }
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const isoDate = selectedDate.toISOString().split('T')[0];
            setDate(isoDate);
            setTextDate(formatDate(isoDate)); // Update textDate immediately
        }
    };

    const handleSaveTransaction = async (numAmount: number) => {
        if (type !== 'transfer' && !selectedCategory) {
            setLoading(false);
            isSubmittingRef.current = false;
            return;
        }
        try {
            if (id) {
                // Update existing transaction
                console.log('Updating transaction with date:', date);
                await TransactionService.updateTransaction(
                    Number(id),
                    numAmount,
                    selectedCategory?.id || null,
                    date,
                    note,
                    paymentMethod
                );
            } else if (recurringId) {
                // Update recurring transaction
                await RecurringService.updateRecurringTransaction(
                    Number(recurringId),
                    numAmount,
                    selectedCategory?.id || 0,
                    frequency,
                    date, // This becomes the new next_date
                    note,
                    type,
                    isActive ? 1 : 0,
                    paymentMethod
                );
            } else {
                // Add new
                if (isRecurring) {
                    await RecurringService.addRecurringTransaction(
                        numAmount,
                        selectedCategory?.id || 0,
                        frequency,
                        date,
                        note,
                        type,
                        paymentMethod
                    );
                } else {
                    if (type === 'transfer') {
                        await TransactionService.addTransfer(
                            numAmount,
                            paymentMethod,
                            date,
                            note
                        );
                    } else {
                        await TransactionService.addTransaction(
                            numAmount,
                            selectedCategory!.id,
                            date,
                            note,
                            type,
                            paymentMethod
                        );
                    }
                }
            }
            router.back();
        } catch (error) {
            console.error(error);
            alert(t('error_save'));
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            t('notification'),
            t('delete_transaction_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (id) {
                                await TransactionService.deleteTransaction(Number(id));
                            } else if (recurringId) {
                                await RecurringService.deleteRecurringTransaction(Number(recurringId));
                            }
                            router.back();
                        } catch (error) {
                            console.error(error);
                            Alert.alert(t('error'), t('error_save'));
                        }
                    }
                }
            ]
        );
    };

    const onSave = async () => {
        if (isSubmittingRef.current || loading) {
            return;
        }

        if (!amount || (type !== 'transfer' && !selectedCategory)) {
            return;
        }

        isSubmittingRef.current = true;
        setLoading(true);
        const numAmount = parseFloat(amount.replace(/,/g, ''));

        // Check Budget Limit
        if (type === 'expense' && selectedCategory && selectedCategory.budget_limit > 0 && !isRecurring) {
            try {
                // Get month range for the selected date
                const txDate = new Date(date);
                const year = txDate.getFullYear();
                const month = txDate.getMonth() + 1;
                const startDate = formatLocalDate(new Date(year, month - 1, 1));
                const endDate = formatLocalDate(new Date(year, month, 0));

                const categorySummaries = await TransactionService.getSummaryByCategory(startDate, endDate, 'expense');

                const currentUsage = categorySummaries.find((c: any) => selectedCategory && c.id === selectedCategory.id)?.total || 0;
                const newTotal = currentUsage + numAmount;
                const limit = selectedCategory.budget_limit;
                const percentage = (newTotal / limit) * 100;

                if (newTotal > limit) {
                    Alert.alert(
                        t('budget_warning_title'),
                        t('budget_exceeded_message', { category: selectedCategory?.name }),
                        [
                            {
                                text: t('cancel'),
                                style: 'cancel',
                                onPress: () => {
                                    setLoading(false);
                                    isSubmittingRef.current = false;
                                }
                            },
                            { text: t('continue_anyway'), onPress: () => handleSaveTransaction(numAmount) }
                        ]
                    );
                    return;
                } else if (percentage >= 80) {
                    Alert.alert(
                        t('budget_warning_title'),
                        t('budget_warning_message', { percent: percentage.toFixed(0), category: selectedCategory?.name }),
                        [
                            {
                                text: t('cancel'),
                                style: 'cancel',
                                onPress: () => {
                                    setLoading(false);
                                    isSubmittingRef.current = false;
                                }
                            },
                            { text: t('continue_anyway'), onPress: () => handleSaveTransaction(numAmount) }
                        ]
                    );
                    return;
                }
            } catch (e) {
                console.warn('Failed to check budget', e);
            }
        }

        await handleSaveTransaction(numAmount);
    };

    if (isInitialLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }]}>
                <Stack.Screen
                    options={{
                        title: t('loading'),
                        headerRight: () => null
                    }}
                />
                <ActivityIndicator size="large" color="#6200ee" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: (id || recurringId) ? t('edit_transaction') : (isRecurring ? t('recurring') : t('add_transaction')),
                    headerRight: () => (id || recurringId) ? (
                        <IconButton
                            icon="trash-can-outline"
                            iconColor="#F44336"
                            onPress={handleDelete}
                        />
                    ) : null
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.content, { paddingBottom: 60 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >

                <SegmentedButtons
                    value={type}
                    onValueChange={(val) => {
                        // Logic: Save current category -> Switch Type -> Restore old category for new type
                        let oldType = type;
                        setType(val);
                        if (val !== 'transfer') {
                            if (oldType === 'income') {
                                setLastIncomeCategory(selectedCategory);
                                setSelectedCategory(lastExpenseCategory);
                            } else {
                                setLastExpenseCategory(selectedCategory);
                                setSelectedCategory(lastIncomeCategory);
                            }
                        }
                    }}
                    buttons={[
                        { value: 'expense', label: t('expense'), icon: 'arrow-down-bold-circle-outline', style: { backgroundColor: type === 'expense' ? '#ffebee' : undefined } },
                        { value: 'income', label: t('income'), icon: 'arrow-up-bold-circle-outline', style: { backgroundColor: type === 'income' ? '#e8f5e9' : undefined } },
                        { value: 'transfer', label: t('transfer'), icon: 'swap-horizontal', style: { backgroundColor: type === 'transfer' ? '#e3f2fd' : undefined } },
                    ]}
                    style={styles.segmentedButton}
                />

                <TextInput
                    label={t('amount')}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                    mode="outlined"
                    left={<TextInput.Affix text={currency === 'VND' ? '₫' : '$'} />}
                />

                {type !== 'transfer' && (
                    <TouchableOpacity onPress={() => setShowCategoryPicker(true)} activeOpacity={0.7}>
                        <View pointerEvents="none">
                            <TextInput
                                label={t('category')}
                                value={selectedCategory?.name}
                                style={styles.input}
                                mode="outlined"
                                placeholder={t('select_category')}
                                editable={false}
                                right={<TextInput.Icon icon="chevron-down" />}
                                left={selectedCategory ? <TextInput.Icon icon={selectedCategory.icon} color={selectedCategory.color} /> : undefined}
                            />
                        </View>
                    </TouchableOpacity>
                )}

                <View style={{ marginBottom: 16 }}>
                    <Text style={{ marginBottom: 8, color: '#666' }}>
                        {type === 'transfer' ? t('from_source') : t('payment_method')}
                    </Text>
                    <SegmentedButtons
                        value={paymentMethod}
                        onValueChange={(val) => setPaymentMethod(val as any)}
                        buttons={[
                            { value: 'e-wallet', label: t('e_wallet'), icon: 'wallet-outline' },
                            { value: 'cash', label: t('cash'), icon: 'cash' },
                        ]}
                    />
                    {type === 'transfer' && (
                        <View style={{ marginTop: 12, alignItems: 'center' }}>
                            <IconButton icon="arrow-down" size={20} style={{ margin: 0 }} />
                            <View style={styles.toSourceContainer}>
                                <Text style={styles.toSourceLabel}>{t('to_source')}: </Text>
                                <Text style={styles.toSourceValue}>
                                    {paymentMethod === 'cash' ? t('e_wallet') : t('cash')}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <TextInput
                    label={t('date')}
                    value={textDate}
                    onChangeText={parseAndSetDate}
                    placeholder={language === 'vi' ? "DD/MM/YYYY" : "MM/DD/YYYY"}
                    style={styles.input}
                    mode="outlined"
                    right={<TextInput.Icon icon="calendar" onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(true);
                    }} />}
                />

                {showDatePicker && (
                    <DateTimePicker
                        value={new Date(date)}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                <TextInput
                    label={t('note')}
                    value={note}
                    onChangeText={setNote}
                    style={styles.input}
                    mode="outlined"
                    multiline
                />

                {recurringId ? (
                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>{t('active')}</Text>
                        <Switch value={isActive} onValueChange={setIsActive} color="#4CAF50" />
                    </View>
                ) : !id && isRecurringParam !== 'true' ? (
                    <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>{t('recurring_question')}</Text>
                        <Switch
                            value={isRecurring}
                            onValueChange={setIsRecurring}
                            color="#6200ee"
                        />
                    </View>
                ) : null}

                {isRecurring && (
                    <View style={styles.recurringOptions}>
                        <Text style={styles.frequencyLabel}>{t('frequency')}:</Text>
                        <SegmentedButtons
                            value={frequency}
                            onValueChange={setFrequency}
                            density="medium"
                            buttons={[
                                { value: 'daily', label: t('daily') },
                                { value: 'weekly', label: t('weekly') },
                                { value: 'monthly', label: t('monthly') },
                            ]}
                            style={styles.frequencyButtons}
                        />
                    </View>
                )}

                <Button
                    mode="contained"
                    onPress={onSave}
                    style={styles.saveButton}
                    loading={loading}
                    disabled={loading || !amount || (type !== 'transfer' && !selectedCategory)}
                >
                    {t('save')}
                </Button>

            </ScrollView>
            </KeyboardAvoidingView>

            <CategoryPicker
                visible={showCategoryPicker}
                onDismiss={() => setShowCategoryPicker(false)}
                onSelect={setSelectedCategory}
                type={type}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    segmentedButton: {
        marginBottom: 20,
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
    },
    switchLabel: {
        fontSize: 16,
    },
    recurringOptions: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f0efff',
        borderRadius: 8,
    },
    frequencyLabel: {
        marginBottom: 8,
        color: '#6200ee',
    },
    frequencyButtons: {
        marginBottom: 10,
    },
    saveButton: {
        marginTop: 10,
        paddingVertical: 6,
        backgroundColor: '#6200ee',
    },
    toSourceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    toSourceLabel: {
        color: '#666',
        fontSize: 14,
    },
    toSourceValue: {
        fontWeight: 'bold',
        color: '#6200ee',
        fontSize: 14,
    }
});
