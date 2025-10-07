import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import schema from './schema';
import Account from './models/Account';
import Transaction from './models/Transaction';
import Category from './models/Category';
import Debt from './models/Debt';
import ExchangeRate from './models/ExchangeRate';
import Setting from './models/Setting';
import SyncMetadata from './models/SyncMetadata';
import Goal from './models/Goal';
import GoalTransfer from './models/GoalTransfer';

// Define migrations
const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        {
          type: 'add_columns',
          table: 'categories',
          columns: [
            { name: 'budget_category', type: 'string', isOptional: true },
          ],
        },
      ],
    },
  ],
});

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false,
  onSetUpError: error => {
    console.error('Database setup error:', error);
  }
});

// Create the database
const database = new Database({
  adapter,
  modelClasses: [
    Account,
    Transaction,
    Category,
    Debt,
    ExchangeRate,
    Setting,
    SyncMetadata,
    Goal,
    GoalTransfer,
  ],
});

export default database; 