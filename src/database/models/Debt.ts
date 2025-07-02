import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Debt extends Model {
  static table = 'debts';

  @field('type') type!: string;
  @field('name') name!: string;
  @field('amount') amount!: number;
  @field('currency') currency?: string;
  @field('exchange_rate') exchangeRate?: number;
  @field('is_included_in_total') isIncludedInTotal!: boolean;
  @field('due_date') dueDate?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;
} 