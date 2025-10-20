// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('hashed-value'),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32).fill(65)),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      googleWebClientId: 'mock-client-id',
    },
  },
}));

// Mock Google Sign In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock React Native NativeModules for WatermelonDB
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.WMDatabaseBridge = {
    initialize: jest.fn(),
    setUpWithSchema: jest.fn(),
    setUpWithMigrations: jest.fn(),
    find: jest.fn(),
    query: jest.fn(),
    queryIds: jest.fn(),
    unsafeQueryRaw: jest.fn(),
    count: jest.fn(),
    batch: jest.fn(),
    batchJSON: jest.fn(),
    getDeletedRecords: jest.fn(),
    destroyDeletedRecords: jest.fn(),
    unsafeResetDatabase: jest.fn(),
    getLocal: jest.fn(),
    setLocal: jest.fn(),
    removeLocal: jest.fn(),
  };
  return RN;
});

// Mock WatermelonDB
const MockCollection = jest.fn().mockImplementation(() => ({
  find: jest.fn().mockResolvedValue(null),
  query: jest.fn(() => ({
    fetch: jest.fn().mockResolvedValue([]),
    fetchCount: jest.fn().mockResolvedValue(0),
    observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  })),
  create: jest.fn().mockResolvedValue({}),
  prepareCreate: jest.fn((fn) => {
    const record = {};
    fn(record);
    return record;
  }),
}));

const MockDatabase = jest.fn().mockImplementation(() => ({
  adapter: {},
  collections: {
    get: jest.fn((tableName) => new MockCollection()),
  },
  action: jest.fn((fn) => fn()),
  write: jest.fn((fn) => fn()),
  read: jest.fn((fn) => fn()),
  batch: jest.fn(),
}));

jest.mock('@nozbe/watermelondb', () => ({
  Database: MockDatabase,
  Q: {
    where: jest.fn((column, value) => ({ type: 'where', column, value })),
    sortBy: jest.fn((column, order) => ({ type: 'sortBy', column, order })),
    take: jest.fn((count) => ({ type: 'take', count })),
    and: jest.fn((...conditions) => ({ type: 'and', conditions })),
    or: jest.fn((...conditions) => ({ type: 'or', conditions })),
    on: jest.fn((table, column, value) => ({ type: 'on', table, column, value })),
  },
  Model: class MockModel {
    constructor() {
      this.id = 'mock-id';
      this.createdAt = Date.now();
      this.updatedAt = Date.now();
    }
    prepareUpdate(fn) {
      fn(this);
      return this;
    }
    prepareMarkAsDeleted() {
      return this;
    }
    prepareDestroyPermanently() {
      return this;
    }
  },
  tableSchema: jest.fn((config) => config),
  appSchema: jest.fn((config) => config),
  field: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  date: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  readonly: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  text: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  relation: jest.fn((tableName, columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  children: jest.fn((tableName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  lazy: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  action: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  writer: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
}));

// Mock WatermelonDB SQLite Adapter
const MockSQLiteAdapter = jest.fn().mockImplementation(() => ({
  schema: {},
  migrations: [],
  dbName: 'test.db',
  batch: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockResolvedValue(null),
  query: jest.fn().mockResolvedValue([]),
  queryIds: jest.fn().mockResolvedValue([]),
  unsafeQueryRaw: jest.fn().mockResolvedValue({ rows: [] }),
  count: jest.fn().mockResolvedValue(0),
  getDeletedRecords: jest.fn().mockResolvedValue([]),
  destroyDeletedRecords: jest.fn().mockResolvedValue(),
  unsafeResetDatabase: jest.fn().mockResolvedValue(),
  getLocal: jest.fn().mockResolvedValue(null),
  setLocal: jest.fn().mockResolvedValue(),
  removeLocal: jest.fn().mockResolvedValue(),
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  __esModule: true,
  default: MockSQLiteAdapter,
  SQLiteAdapter: MockSQLiteAdapter,
}));

// Mock WatermelonDB Schema migrations
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn((config) => config.migrations || []),
  addColumns: jest.fn(),
  createTable: jest.fn(),
  unsafeExecuteSql: jest.fn(),
}));

// Mock WatermelonDB decorators
jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  date: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  readonly: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  text: jest.fn((columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  relation: jest.fn((tableName, columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  children: jest.fn((tableName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  lazy: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  action: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  writer: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  immutableRelation: jest.fn((tableName, columnName) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  json: jest.fn((columnName, sanitizer) => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
  nochange: jest.fn(() => {
    return function(target, key, descriptor) {
      return descriptor;
    };
  }),
}));

// Mock Localization Context
jest.mock('./src/context/LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key) => {
      const translations = {
        'accounts.totalBalance': 'Total Balance',
        'accounts.income': 'Income',
        'accounts.expenses': 'Expenses',
        'accounts.statsForPeriod': 'Statistics for Period',
        'transactions.transfer': 'Transfer',
        'transactions.expense': 'Expense',
        'transactions.income': 'Income',
        'transactions.gaveLoan': 'Gave Loan',
        'transactions.receivedLoan': 'Received Loan',
        'transactions.borrowedMoney': 'Borrowed Money',
        'transactions.paidBackDebt': 'Paid Back Debt',
        'statistics.today': 'Today',
        'statistics.thisWeek': 'This Week',
        'statistics.thisMonth': 'This Month',
        'statistics.thisYear': 'This Year',
        'statistics.selectPeriod': 'Select Period',
        'plans.canSpendToday': 'Can Spend Today',
      };
      return translations[key] || key;
    },
    locale: 'en',
  }),
  LocalizationProvider: ({ children }) => children,
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
