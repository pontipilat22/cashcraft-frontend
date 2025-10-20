import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class CreditPaymentSchedule extends Model {
  static table = 'credit_payment_schedules';
  static associations = {
    accounts: { type: 'belongs_to' as const, key: 'account_id' },
  };

  @field('account_id') accountId!: string;
  @field('payment_number') paymentNumber!: number;
  @field('payment_date') paymentDate!: string;
  @field('total_payment') totalPayment!: number;
  @field('principal_payment') principalPayment!: number;
  @field('interest_payment') interestPayment!: number;
  @field('remaining_balance') remainingBalance!: number;
  @field('status') status!: string; // 'pending', 'paid', 'overdue', 'partial'
  @field('paid_amount') paidAmount?: number;
  @field('paid_date') paidDate?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  // Связь с аккаунтом
  @relation('accounts', 'account_id') account: any;
}
