-- Migration 013: Room Size
-- Purpose: Add room_size dimension (Big/Small/Service) to match Excel reporting
-- Critical for Camp 2 summary reports

ALTER TABLE rooms
  ADD COLUMN room_size VARCHAR(20) DEFAULT 'small';
  -- Values: 'big' | 'small' | 'service'

COMMENT ON COLUMN rooms.room_size IS
  'Client categorization for reporting. Big = larger corporate units, Small = standard, Service = utility/non-residential rooms (mosque, electricity room, camp office).';

CREATE INDEX idx_rooms_size ON rooms(camp_id, room_size);

-- Populate from Excel-derived knowledge
-- Camp 2 breakdown: ~17 big rooms, ~3 service rooms, rest small
-- NOTE: UUIDs need verification against actual seed data

-- Service rooms (utility/non-residential)
UPDATE rooms SET room_size = 'service'
  WHERE camp_id = '1af2c34d-6c38-1b45-277f-072f900acbc1'  -- Camp 2
    AND room_number IN ('A01', 'S01');  -- Adjust based on actual service room numbers

-- Big rooms (max_capacity >= 10 or commercial type)
UPDATE rooms SET room_size = 'big'
  WHERE camp_id = '1af2c34d-6c38-1b45-277f-072f900acbc1'  -- Camp 2
    AND (max_capacity >= 10 OR room_type = 'commercial');

-- Camp 1: Needs manual categorization (Excel doesn't specify size for Camp 1)
-- UPDATE rooms SET room_size = 'big' WHERE camp_id = '...' AND room_number IN (...);
