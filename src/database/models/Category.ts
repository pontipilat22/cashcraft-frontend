import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Category extends Model {
  static table = 'categories';

  @field('name') name!: string;
  @field('type') type!: string;
  @field('icon') icon!: string;
  @field('color') color!: string;
  @date('synced_at') syncedAt?: Date;
} 