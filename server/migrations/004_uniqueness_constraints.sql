-- Migration 004: Uniqueness Constraints
-- Purpose: Prevent duplicate active contracts and current occupancies per room
-- Uses partial unique indexes to allow multiple historical records

-- Only one active contract per room
CREATE UNIQUE INDEX idx_contracts_one_active_per_room
  ON contracts(room_id)
  WHERE status = 'active';

-- Only one current occupancy per room
CREATE UNIQUE INDEX idx_occupancy_one_current_per_room
  ON room_occupancy(room_id)
  WHERE is_current = true;
