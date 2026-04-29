-- H2: prevent double-booking the same (salon_id, date, time_slot) for active bookings.
-- Public booking flow + admin walk-in flow both check before insert, but a partial
-- unique index closes the race window between the check and the insert.
--
-- Partial index: only enforces uniqueness for bookings that ARE actively holding
-- a slot (pending or confirmed). Cancelled / done / no-show bookings can coexist
-- at the same slot (e.g. a cancelled appointment at 10:00 + a new confirmed one at 10:00).

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_unique
  ON bookings (salon_id, date, time_slot)
  WHERE status IN ('pending', 'confirmed');
