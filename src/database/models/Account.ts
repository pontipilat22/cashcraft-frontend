import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Account extends Model {
  static table = 'accounts';

  @field('name') name!: string;
  @field('type') type!: string;
  @field('balance') balance!: number;
  @field('currency') currency?: string;
  @field('exchange_rate') exchangeRate?: number;
  @field('card_number') cardNumber?: string;
  @field('color') color?: string;
  @field('icon') icon?: string;
  @field('is_default') isDefault!: boolean;
  @field('is_included_in_total') isIncludedInTotal!: boolean;
  @field('target_amount') targetAmount?: number;
  @field('linked_account_id') linkedAccountId?: string;
  @field('saved_amount') savedAmount!: number;
  @field('credit_start_date') creditStartDate?: string;
  @field('credit_term') creditTerm?: number;
  @field('credit_rate') creditRate?: number;
  @field('credit_payment_type') creditPaymentType?: string;
  @field('credit_initial_amount') creditInitialAmount?: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;
} 