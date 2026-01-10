import ColorPickerModal from '@/components/ColorPickerModal';
import { useSettings } from '@/context/SettingsContext';
import CategoryService from '@/services/CategoryService';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, FAB, IconButton, Modal, Portal, Provider, SegmentedButtons, Text, TextInput } from 'react-native-paper';

interface Category {
    id: number;
    name: string;
    type: string;
    color: string;
    icon: string;
    budget_limit: number;
}

export default function CategoriesScreen() {
    const { t } = useTranslation();
    const { currency } = useSettings();

    const [categories, setCategories] = useState<Category[]>([]);
    const [visible, setVisible] = useState(false);
    const [colorPickerVisible, setColorPickerVisible] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('expense');
    const [color, setColor] = useState('#6200ee');
    const [icon, setIcon] = useState('help-circle');
    const [budgetLimit, setBudgetLimit] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await CategoryService.getAllCategories();
            setCategories(data);
        } catch (error) {
            console.error(error);
        }
    };

    const showModal = (category?: Category) => {
        if (category) {
            setEditingId(category.id);
            setName(category.name);
            setType(category.type);
            setColor(category.color);
            setIcon(category.icon);
            setBudgetLimit(category.budget_limit ? category.budget_limit.toString() : '');
        } else {
            setEditingId(null);
            setName('');
            setType('expense');
            setColor('#6200ee');
            setIcon('help-circle');
            setBudgetLimit('');
        }
        setVisible(true);
    };

    const hideModal = () => setVisible(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert(t('notification'), t('enter_name'));
            return;
        }

        const limit = parseFloat(budgetLimit.replace(/,/g, '')) || 0;

        try {
            if (editingId) {
                await CategoryService.updateCategory(editingId, name, type, color, icon, limit);
            } else {
                await CategoryService.addCategory(name, type, color, icon, limit);
            }
            loadCategories();
            hideModal();
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), t('error_save'));
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            t('delete_category'),
            t('delete_confirm_message'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CategoryService.deleteCategory(id);
                            loadCategories();
                        } catch (error: any) {
                            Alert.alert(t('error'), error.message);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: Category }) => (
        <View style={styles.item}>
            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
            <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                    <Text style={[styles.itemType, item.type === 'income' ? styles.income : styles.expense]}>
                        {item.type === 'income' ? t('income') : t('expense')}
                    </Text>
                    {item.type === 'expense' && item.budget_limit > 0 && (
                        <Text style={styles.budgetLimit}>
                            {t('budget_limit')}: {new Intl.NumberFormat('en-US').format(item.budget_limit)}
                        </Text>
                    )}
                </View>
            </View>
            <IconButton icon="pencil" size={20} onPress={() => showModal(item)} />
            <IconButton icon="delete" iconColor="#F44336" size={20} onPress={() => handleDelete(item.id)} />
        </View>
    );

    return (
        <Provider>
            <View style={styles.container}>
                <Stack.Screen options={{ title: t('category_management') }} />
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />

                <Portal>
                    <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{editingId ? t('edit_category') : t('add_category')}</Text>

                        <TextInput
                            label={t('category_name')}
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                            mode="outlined"
                        />

                        <SegmentedButtons
                            value={type}
                            onValueChange={setType}
                            buttons={[
                                { value: 'expense', label: t('expense') },
                                { value: 'income', label: t('income') },
                            ]}
                            style={styles.segmentedButton}
                        />

                        {type === 'expense' && (
                            <TextInput
                                label={t('budget_limit')}
                                value={budgetLimit}
                                onChangeText={setBudgetLimit}
                                keyboardType="numeric"
                                style={styles.input}
                                mode="outlined"
                                left={<TextInput.Affix text={currency === 'VND' ? '₫' : '$'} />}
                            />
                        )}

                        <TouchableOpacity onPress={() => setColorPickerVisible(true)}>
                            <View pointerEvents="none">
                                <TextInput
                                    label={t('color')}
                                    style={styles.input}
                                    mode="outlined"
                                    editable={false}
                                    right={<TextInput.Icon icon="chevron-down" />}
                                    left={<TextInput.Icon icon="circle" color={color} />}
                                />
                            </View>
                        </TouchableOpacity>

                        <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
                            {t('save')}
                        </Button>
                    </Modal>

                    <ColorPickerModal
                        visible={colorPickerVisible}
                        onDismiss={() => setColorPickerVisible(false)}
                        onSelect={(selectedColor) => {
                            setColor(selectedColor);
                            setColorPickerVisible(false);
                        }}
                        currentColor={color}
                    />
                </Portal>

                <FAB
                    icon="plus"
                    style={styles.fab}
                    onPress={() => showModal()}
                />
            </View>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        elevation: 2,
    },
    colorIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemDetails: {
        flexDirection: 'column',
    },
    itemType: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    income: {
        color: '#4CAF50',
    },
    expense: {
        color: '#F44336',
    },
    budgetLimit: {
        fontSize: 12,
        color: '#757575',
        marginTop: 2,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#6200ee',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    segmentedButton: {
        marginBottom: 16,
    },
    saveButton: {
        backgroundColor: '#6200ee',
    },
    label: {
        marginBottom: 8,
        fontSize: 14,
        color: '#666',
    },
    colorSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#79747E',
        borderRadius: 4,
        backgroundColor: 'white',
    },
    colorPreview: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    colorText: {
        fontSize: 16,
        color: '#1d1b20',
    },
});
