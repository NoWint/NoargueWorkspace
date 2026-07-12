ALTER TABLE sync_logs MODIFY COLUMN action ENUM('upload', 'download', 'merge', 'sync', 'full_sync');
