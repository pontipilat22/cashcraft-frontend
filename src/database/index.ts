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
import CreditPaymentSchedule from './models/CreditPaymentSchedule';

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
    {
      toVersion: 5,
      steps: [
        {
          type: 'create_table',
          table: 'credit_payment_schedules',
          columns: [
            { name: 'account_id', type: 'string', isIndexed: true },
            { name: 'payment_number', type: 'number' },
            { name: 'payment_date', type: 'string' },
            { name: 'total_payment', type: 'number' },
            { name: 'principal_payment', type: 'number' },
            { name: 'interest_payment', type: 'number' },
            { name: 'remaining_balance', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'paid_amount', type: 'number', isOptional: true },
            { name: 'paid_date', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'synced_at', type: 'number', isOptional: true },
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
    CreditPaymentSchedule,
  ],
});

export default database; 