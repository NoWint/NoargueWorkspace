ALTER TABLE share_snapshots
  ADD COLUMN revoked TINYINT(1) NOT NULL DEFAULT 0 AFTER data,
  ADD INDEX idx_revoked (revoked);
