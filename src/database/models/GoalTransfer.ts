import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class GoalTransfer extends Model {
  static table = 'goal_transfers';

  @field('goal_id') goalId!: string;
  @field('account_id') accountId!: string;
  @field('amount') amount!: number;
  @field('description') description?: string;
  @field('date') date!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  // Связи
  @relation('goals', 'goal_id') goal: any;
  @relation('accounts', 'account_id') account: any;
}

