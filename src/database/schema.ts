import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'balance', type: 'number' },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'exchange_rate', type: 'number', isOptional: true },
        { name: 'card_number', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'is_default', type: 'boolean' },
        { name: 'is_included_in_total', type: 'boolean' },
        { name: 'is_targeted_savings', type: 'boolean', isOptional: true },
        { name: 'target_amount', type: 'number', isOptional: true },
        { name: 'linked_account_id', type: 'string', isOptional: true },
        { name: 'saved_amount', type: 'number' },
        { name: 'credit_start_date', type: 'string', isOptional: true },
        { name: 'credit_term', type: 'number', isOptional: true },
        { name: 'credit_rate', type: 'number', isOptional: true },
        { name: 'credit_payment_type', type: 'string', isOptional: true },
        { name: 'credit_initial_amount', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'amount', type: 'number' },
        { name: 'type', type: 'string' },
        { name: 'account_id', type: 'string', isIndexed: true },
        { name: 'category_id', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'date', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'budget_category', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'debts',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'currency', type: 'string', isOptional: true },
        { name: 'exchange_rate', type: 'number', isOptional: true },
        { name: 'is_included_in_total', type: 'boolean' },
        { name: 'due_date', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'exchange_rates',
      columns: [
        { name: 'from_currency', type: 'string' },
        { name: 'to_currency', type: 'string' },
        { name: 'rate', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'settings',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
      ]
    }),
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'last_sync_at', type: 'string', isOptional: true },
        { name: 'sync_token', type: 'string', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'goals',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'target_amount', type: 'number' },
        { name: 'current_amount', type: 'number' },
        { name: 'currency', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
    tableSchema({
      name: 'goal_transfers',
      columns: [
        { name: 'goal_id', type: 'string', isIndexed: true },
        { name: 'account_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'date', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ]
    }),
  ]
}); 