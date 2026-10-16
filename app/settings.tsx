import { useSettings } from '@/context/SettingsContext';
import BackupService, { ParsedBackup } from '@/services/BackupService';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Divider, List, Portal, RadioButton, Text } from 'react-native-paper';

export default function SettingsScreen() {
    const { language, currency, setLanguage, setCurrency } = useSettings();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [pendingBackup, setPendingBackup] = useState<{
        data: ParsedBackup['data'];
        counts: ParsedBackup['counts'];
        fileName: string;
        exportedAt?: string;
    } | null>(null);

    const [resultDialog, setResultDialog] = useState<{
        visible: boolean;
        title: string;
        message: string;
        isError?: boolean;
    }>({
        visible: false,
        title: '',
        message: '',
    });

    const handleExport = async () => {
        try {
            setLoading(true);
            const res = await BackupService.exportDatabase();
            setResultDialog({
                visible: true,
                title: t('export_success_title'),
                message: t('export_success_msg', {
                    categories: res.counts.categories,
                    transactions: res.counts.transactions,
                    recurring: res.counts.recurring_transactions,
                }),
            });
        } catch (error: any) {
            setResultDialog({
                visible: true,
                title: t('export_failed'),
                message: error?.message || String(error),
                isError: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePickImportFile = async () => {
        try {
            setLoading(true);
            const file = await BackupService.pickBackupFile();
            if (!file) {
                return;
            }

            const parsed = BackupService.parseBackupContent(file.content);
            setPendingBackup({
                data: parsed.data,
                counts: parsed.counts,
                fileName: file.fileName,
                exportedAt: parsed.metadata.exportedAt,
            });
            setConfirmDialogVisible(true);
        } catch (error: any) {
            setResultDialog({
                visible: true,
                title: t('import_failed'),
                message: error?.message || String(error),
                isError: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const executeRestore = async () => {
        if (!pendingBackup) return;
        setConfirmDialogVisible(false);

        try {
            setLoading(true);
            const res = await BackupService.restoreDatabase(pendingBackup.data);
            setResultDialog({
                visible: true,
                title: t('import_success_title'),
                message: t('import_success_msg', {
                    categories: res.counts.categories,
                    transactions: res.counts.transactions,
                }),
            });
        } catch (error: any) {
            setResultDialog({
                visible: true,
                title: t('import_failed'),
                message: error?.message || String(error),
                isError: true,
            });
        } finally {
            setPendingBackup(null);
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('settings') }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <List.Section>
                    <List.Subheader>{t('language')}</List.Subheader>
                    <RadioButton.Group onValueChange={value => setLanguage(value as 'vi' | 'en')} value={language}>
                        <List.Item
                            title={t('vietnamese')}
                            left={() => <List.Icon icon="web" />}
                            right={() => <RadioButton value="vi" />}
                        />
                        <List.Item
                            title={t('english')}
                            left={() => <List.Icon icon="web" />}
                            right={() => <RadioButton value="en" />}
                        />
                    </RadioButton.Group>
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader>{t('currency')}</List.Subheader>
                    <RadioButton.Group onValueChange={value => setCurrency(value as 'VND' | 'USD')} value={currency}>
                        <List.Item
                            title="VND (₫)"
                            left={() => <List.Icon icon="cash" />}
                            right={() => <RadioButton value="VND" />}
                        />
                        <List.Item
                            title="USD ($)"
                            left={() => <List.Icon icon="currency-usd" />}
                            right={() => <RadioButton value="USD" />}
                        />
                    </RadioButton.Group>
                </List.Section>

                <Divider />

                <List.Section>
                    <List.Subheader>{t('backup_and_restore')}</List.Subheader>
                    <List.Item
                        title={t('export_data')}
                        description={t('export_data_desc')}
                        left={() => <List.Icon icon="database-export" color="#4CAF50" />}
                        right={() => loading ? <ActivityIndicator size="small" /> : undefined}
                        onPress={handleExport}
                        disabled={loading}
                    />
                    <List.Item
                        title={t('import_data')}
                        description={t('import_data_desc')}
                        left={() => <List.Icon icon="database-import" color="#2196F3" />}
                        right={() => loading ? <ActivityIndicator size="small" /> : undefined}
                        onPress={handlePickImportFile}
                        disabled={loading}
                    />
                </List.Section>
            </ScrollView>

            <Portal>
                {/* Confirmation Dialog for Restore */}
                <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
                    <Dialog.Title>{t('import_confirm_title')}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            {t('import_confirm_msg', {
                                categories: pendingBackup?.counts.categories ?? 0,
                                transactions: pendingBackup?.counts.transactions ?? 0,
                                recurring: pendingBackup?.counts.recurring_transactions ?? 0,
                            })}
                        </Text>
                        {pendingBackup?.fileName && (
                            <Text variant="bodySmall" style={styles.fileNameText}>
                                {pendingBackup.fileName}
                            </Text>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDialogVisible(false)}>{t('cancel')}</Button>
                        <Button textColor="#D32F2F" onPress={executeRestore}>{t('restore')}</Button>
                    </Dialog.Actions>
                </Dialog>

                {/* Status / Alert Result Dialog */}
                <Dialog visible={resultDialog.visible} onDismiss={() => setResultDialog(prev => ({ ...prev, visible: false }))}>
                    <Dialog.Title>{resultDialog.title}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={resultDialog.isError ? styles.errorText : undefined}>
                            {resultDialog.message}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setResultDialog(prev => ({ ...prev, visible: false }))}>{t('ok')}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 24,
    },
    fileNameText: {
        marginTop: 8,
        color: '#666',
        fontStyle: 'italic',
    },
    errorText: {
        color: '#D32F2F',
    },
});
