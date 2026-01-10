import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useSettings } from '@/context/SettingsContext';
import { Transaction } from '@/types';

interface TransactionItemProps {
    transaction: Transaction;
    onPress: () => void;
}

const TransactionItem = ({ transaction, onPress }: TransactionItemProps) => {
    const isIncome = transaction.type === 'income';
    const { formatMoney, language } = useSettings();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.leftSection}>
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: transaction.category_color + '20' }
                    ]}
                >
                    <MaterialCommunityIcons
                        name={transaction.category_icon as any}
                        size={24}
                        color={transaction.category_color}
                    />
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.categoryName}>{transaction.category_name}</Text>
                    <Text style={styles.date}>{formatDate(transaction.date)}</Text>
                    {transaction.note ? (
                        <Text style={styles.note} numberOfLines={1}>{transaction.note}</Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.rightSection}>
                <Text
                    style={[
                        styles.amount,
                        { color: isIncome ? '#4CAF50' : '#F44336' }
                    ]}
                >
                    {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212121',
        marginBottom: 2,
    },
    date: {
        fontSize: 13,
        color: '#757575',
        marginBottom: 2,
    },
    note: {
        fontSize: 12,
        color: '#9E9E9E',
        fontStyle: 'italic',
    },
    rightSection: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default React.memo(TransactionItem);
