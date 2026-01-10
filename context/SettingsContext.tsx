import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../utils/i18n';

type Language = 'vi' | 'en';
type Currency = 'VND' | 'USD';

interface SettingsContextType {
    language: Language;
    currency: Currency;
    setLanguage: (lang: Language) => Promise<void>;
    setCurrency: (curr: Currency) => Promise<void>;
    formatMoney: (amount: number) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('vi');
    const [currency, setCurrencyState] = useState<Currency>('VND');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedLang = await AsyncStorage.getItem('language');
            const savedCurr = await AsyncStorage.getItem('currency');

            if (savedLang) {
                setLanguageState(savedLang as Language);
                i18n.changeLanguage(savedLang);
            }
            if (savedCurr) {
                setCurrencyState(savedCurr as Currency);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const setLanguage = async (lang: Language) => {
        try {
            setLanguageState(lang);
            i18n.changeLanguage(lang);
            await AsyncStorage.setItem('language', lang);
        } catch (error) {
            console.error('Failed to save language', error);
        }
    };

    const setCurrency = async (curr: Currency) => {
        try {
            setCurrencyState(curr);
            await AsyncStorage.setItem('currency', curr);
        } catch (error) {
            console.error('Failed to save currency', error);
        }
    };

    const formatMoney = (amount: number) => {
        if (currency === 'VND') {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
            }).format(amount);
        } else {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
        }
    };

    return (
        <SettingsContext.Provider value={{ language, currency, setLanguage, setCurrency, formatMoney }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
