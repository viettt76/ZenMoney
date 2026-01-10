import { Category } from '@/types';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Modal, Portal, Searchbar, Text } from 'react-native-paper';
import CategoryService from '../services/CategoryService';

interface CategoryPickerProps {
    visible: boolean;
    onDismiss: () => void;
    onSelect: (item: Category) => void;
    type: string;
}

const CategoryPicker = ({ visible, onDismiss, onSelect, type }: CategoryPickerProps) => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (searchQuery) {
            setFilteredCategories(
                categories.filter((cat) => cat.name.toLowerCase().includes(searchQuery.toLowerCase())),
            );
        } else {
            setFilteredCategories(categories);
        }
    }, [searchQuery, categories]);

    const loadCategories = React.useCallback(async () => {
        try {
            const data = type
                ? await CategoryService.getCategoriesByType(type)
                : await CategoryService.getAllCategories();
            setCategories(data);
            setFilteredCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }, [type]);

    useEffect(() => {
        if (visible) {
            loadCategories();
        }
    }, [visible, type, loadCategories]);

    const renderCategoryItem = ({ item }: { item: Category }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => {
                onSelect(item);
                onDismiss();
                setSearchQuery('');
            }}
        >
            <View style={styles.categoryContent}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={[styles.typeTag, item.type === 'income' ? styles.typeIncome : styles.typeExpense]}>
                    {item.type === 'income' ? t('income_tag') : t('expense_tag')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={() => {
                    onDismiss();
                    setSearchQuery('');
                }}
                contentContainerStyle={styles.modalContainer}
            >
                <Text style={styles.title}>{t('select_category')}</Text>

                <Searchbar
                    placeholder={t('search_category')}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchBar}
                />

                <FlatList
                    data={filteredCategories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 16,
        maxHeight: '80%',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#212121',
    },
    searchBar: {
        marginBottom: 16,
        elevation: 0,
        backgroundColor: '#F5F5F5',
    },
    list: {
        maxHeight: 400,
    },
    categoryItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    categoryName: {
        fontSize: 16,
        flex: 1,
        color: '#212121',
    },
    typeTag: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    typeIncome: {
        backgroundColor: '#e8f5e9',
        color: '#4CAF50',
    },
    typeExpense: {
        backgroundColor: '#ffebee',
        color: '#F44336',
    },
});

export default CategoryPicker;
