import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsProvider } from '@/context/SettingsContext';
import { initDatabase } from '@/database/db';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = React.useState(false);

  React.useEffect(() => {
    initDatabase()
      .then(() => setDbInitialized(true))
      .catch((e) => console.error(e));
  }, []);

  if (!dbInitialized) {
    return null; // Or a splash screen
  }

  return (
    <SettingsProvider>
      <PaperProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SafeAreaView style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="add-transaction" options={{ presentation: 'modal', title: t('add_transaction') }} />
              <Stack.Screen name="history" options={{ title: t('transaction_history') }} />
              <Stack.Screen name="categories" options={{ title: t('category_management') }} />
              <Stack.Screen name="recurring" options={{ title: t('recurring_transactions') }} />
              <Stack.Screen name="settings" options={{ title: t('settings') }} />
            </Stack>
          </SafeAreaView>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </SettingsProvider>
  );
}
