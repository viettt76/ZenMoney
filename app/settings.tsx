import { useSettings } from '@/context/SettingsContext';
import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Divider, List, RadioButton } from 'react-native-paper';

export default function SettingsScreen() {
    const { language, currency, setLanguage, setCurrency } = useSettings();
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('settings') }} />

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
