# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cashcraft is a React Native/Expo mobile application for personal finance management with multi-currency support. The app uses WatermelonDB for local data storage and synchronizes with a Node.js backend API.

## Commands

### Development
- `npm start` - Start Expo development server
- `npm run start:clear` - Start with cleared cache
- `npm run start:fix` - Start with localhost binding and cleared cache (for Windows Cyrillic path issues)
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run web version

### Testing and Linting
Currently no automated testing or linting commands are configured. When implementing tests, follow React Native testing conventions and add appropriate scripts to package.json.

## Architecture

### Database Layer
- **Local Database**: WatermelonDB (SQLite-based ORM for React Native)
- **Schema Version**: 4 (in `src/database/schema.ts`)
- **Models**: Account, Transaction, Category, Debt, Goal, GoalTransfer, ExchangeRate, Setting, SyncMetadata
- **Database Instance**: Exported from `src/database/index.ts`

### State Management
The app uses React Context API for global state management with multiple specialized contexts:

- **AuthContext**: User authentication, guest mode, Google Sign-In
- **DataContext**: Core app data (accounts, transactions, categories, debts, goals)
- **ThemeContext**: Dark/light theme switching
- **CurrencyContext**: Multi-currency support with exchange rates
- **LocalizationContext**: i18n support (13 languages: en, ru, de, fr, it, tr, pl, zh, uk, kk, hi, ar, el)
- **SubscriptionContext**: Premium features and in-app purchases

### Context Provider Hierarchy
```
ThemeProvider
  └── LocalizationProvider
    └── CurrencyProvider
      └── AuthProvider
        └── AppContent (conditional rendering based on auth state)
          └── SubscriptionProvider (when user is authenticated)
            └── DataProvider (recreated when currency changes)
```

### Services Architecture
- **LocalDatabaseService**: Primary interface for WatermelonDB operations
- **ApiService**: Backend API communication with JWT authentication
- **AuthService**: Authentication logic (email/password, Google OAuth, guest mode)
- **ExchangeRateService**: Currency conversion and rate management
- **CloudSyncService**: Data synchronization between local and remote databases

### Component Structure
- **Screens**: Full-screen components for navigation (`src/screens/`)
- **Modals**: Overlay components for data entry/editing (`src/components/*Modal.tsx`)
- **UI Components**: Reusable interface elements (`src/components/`)
- **Navigation**: Bottom tab navigator with stack navigators for each section

### Key Features Implementation
- **Multi-currency**: Each account has its own currency with exchange rate tracking
- **Transfer System**: Special transaction type for inter-account transfers with automatic currency conversion
- **Goal Tracking**: Savings goals with dedicated transfer tracking
- **Debt Management**: Track loans and debts with due dates
- **Offline-first**: All data stored locally, synced when online
- **Guest Mode**: Full functionality without account creation

## Important Technical Notes

### UUID Generation
WatermelonDB UUID generation is configured globally in App.tsx using `react-native-get-random-values` polyfill. This must be imported before any other modules.

### Cyrillic Path Issues
Metro config includes special handling for Windows systems with Cyrillic usernames in file paths. The configuration in `metro.config.js` overrides header handling to prevent encoding issues. Use `npm run start:fix` if experiencing path-related issues.

### Database Migrations
When modifying the database schema:
1. Increment version number in `src/database/schema.ts`
2. Handle data migration in WatermelonDB migration format
3. Test thoroughly as migrations can cause data loss

### Context Dependencies
- DataProvider depends on CurrencyContext and must be recreated when default currency changes
- AuthContext must be initialized before DataContext
- All contexts use proper cleanup in useEffect hooks

### Performance Considerations
- Transaction lists use optimized rendering for large datasets
- Transfer transactions are grouped and displayed specially
- Database queries are optimized with proper indexing
- State updates are batched to prevent excessive re-renders

## File Conventions

- Use TypeScript for all new files
- Follow existing naming patterns (PascalCase for components, camelCase for utilities)
- Place modals in `/components/` with `Modal.tsx` suffix
- Place screens in `/screens/` with `Screen.tsx` suffix
- Database models in `/database/models/` with capitalized names matching table names

## Development Workflow

1. Local development uses WatermelonDB without backend dependency
2. Authentication can work in guest mode for development
3. Test currency conversion logic carefully due to multi-currency complexity
4. Always test transfer operations between different currency accounts
5. Verify context hierarchy when adding new global state


## AI Assistant GuideLines

# Разработка ведется на ОС Windows
# Ты должен общаться на русском языке
