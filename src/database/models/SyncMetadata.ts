import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class SyncMetadata extends Model {
  static table = 'sync_metadata';

  @field('last_sync_at') lastSyncAt?: string;
  @field('sync_token') syncToken?: string;
} 