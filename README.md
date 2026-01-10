# Zen Money 🧧

**Zen Money** is a sleek, modern, and efficient personal finance management application built with React Native and Expo. It helps you track your income, expenses, and simplify your financial life.

---

## ✨ Key Features

- **📊 Visual Dashboard**: Get an immediate overview of your monthly income, expenses, and total balance.
- **💸 Transaction Management**: Easily record, edit, and delete your daily financial activities.
- **🔄 Recurring Transactions**: Automate fixed expenses or income (like rent or salary) with **daily, weekly, or monthly** repeats.
- **🛡️ Budget Tracking**: Set spending limits for specific categories. Get visual warnings at 80% usage and when a budget is exceeded.
- **🏷️ Category Management**: Organize your finances with custom categories and a wide variety of colors.
- **🔍 Transaction History**: Review all your past activities with filters for date ranges and categories.
- **🌐 Multi-language Support**: Fully localized in both **English** and **Vietnamese**.
- **💰 Currency Formatting**: Supports **VND** (₫) and **USD** ($) formats.
- **🎨 Modern UI**: Clean and intuitive interface using React Native Paper (Material Design 3).
- **💾 Local Storage**: Your financial data stays private and secure on your device using SQLite.

---

## 🛠️ Technology Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **UI Components**: [React Native Paper](https://reactnativepaper.com/)
- **Database**: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- **Localization**: [i18next](https://www.i18next.com/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)

---

## 📂 Project Structure

```text
├── app/                  # Application screens (Expo Router)
│   ├── (tabs)/           # Main Tab navigation (Home, Budget, etc.)
│   ├── _layout.tsx       # Root layout
│   ├── add-transaction.tsx # Add/Edit transaction form
│   └── ...
├── components/           # Reusable UI components
├── database/             # SQLite initialization and schema
├── services/             # Business logic and database operations
├── types/                # TypeScript interface definitions
└── utils/                # Helper functions (i18n, currency formatting)
```

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Project**
   ```bash
   npx expo start
   ```

---

*Made with ❤️ for better financial health.*
