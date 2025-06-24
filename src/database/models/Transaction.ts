import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class Transaction extends Model {
  static table = 'transactions';
  static associations = {
    accounts: { type: 'belongs_to' as const, key: 'account_id' },
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @field('amount') amount!: number;
  @field('type') type!: string;
  @field('account_id') accountId!: string;
  @field('category_id') categoryId?: string;
  @field('description') description?: string;
  @field('date') date!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  @relation('accounts', 'account_id') account!: any;
  @relation('categories', 'category_id') category!: any;
} 