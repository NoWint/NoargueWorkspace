-- Hash existing plaintext passwords with SHA-256
-- This is a one-way migration: after this, all passwords are stored as sha256 hex (64 chars)
UPDATE share_snapshots
SET password = SHA2(password, 256)
WHERE password IS NOT NULL AND LENGTH(password) < 64;
