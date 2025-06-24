import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class ExchangeRate extends Model {
  static table = 'exchange_rates';

  @field('from_currency') fromCurrency!: string;
  @field('to_currency') toCurrency!: string;
  @field('rate') rate!: number;
  @date('updated_at') updatedAt!: Date;
} 