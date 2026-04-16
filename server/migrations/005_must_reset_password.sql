-- Migration 005: Must Reset Password
-- Purpose: Add password reset flag to force seeded users to change placeholder passwords
-- Security measure for first login

ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN DEFAULT false;

-- Flag seeded users with placeholder passwords
UPDATE users
SET must_reset_password = true
WHERE password_hash LIKE '$2b$12$PLACEHOLDER%';
