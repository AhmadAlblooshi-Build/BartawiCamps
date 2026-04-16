-- Migration 003: Notification Snooze
-- Purpose: Add snooze functionality to notifications
-- Allows staff to temporarily suppress alerts until a specified date

ALTER TABLE notifications
  ADD COLUMN snoozed_until TIMESTAMPTZ;

CREATE INDEX idx_notifications_snoozed ON notifications(snoozed_until)
  WHERE snoozed_until IS NOT NULL;
