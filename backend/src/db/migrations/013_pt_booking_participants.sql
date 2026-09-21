-- Legacy bookings deliberately have no snapshot; never infer historical membership.
ALTER TABLE pt_bookings ADD COLUMN IF NOT EXISTS participants_snapshot_xid BIGINT NULL;

CREATE TABLE IF NOT EXISTS pt_booking_participants (
    booking_id UUID NOT NULL REFERENCES pt_bookings(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_booking_participants_member ON pt_booking_participants(member_id, booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pt_booking_participants_leader ON pt_booking_participants(booking_id) WHERE is_leader;

CREATE OR REPLACE FUNCTION guard_pt_booking_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Booking participants are immutable' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pt_bookings WHERE id=NEW.booking_id AND participants_snapshot_xid=txid_current()) THEN
        RAISE EXCEPTION 'Participants must be recorded in the booking creation transaction' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_guard_pt_booking_participants ON pt_booking_participants;
CREATE TRIGGER trg_guard_pt_booking_participants BEFORE INSERT OR UPDATE OR DELETE ON pt_booking_participants
    FOR EACH ROW EXECUTE FUNCTION guard_pt_booking_participants();

CREATE OR REPLACE FUNCTION guard_pt_booking_snapshot_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.participants_snapshot_xid IS DISTINCT FROM OLD.participants_snapshot_xid
       OR (OLD.participants_snapshot_xid IS NOT NULL AND
           (NEW.member_id IS DISTINCT FROM OLD.member_id OR NEW.registration_id IS DISTINCT FROM OLD.registration_id)) THEN
        RAISE EXCEPTION 'Booking participant snapshot and owner are immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_guard_pt_booking_snapshot_owner ON pt_bookings;
CREATE TRIGGER trg_guard_pt_booking_snapshot_owner BEFORE UPDATE ON pt_bookings
    FOR EACH ROW EXECUTE FUNCTION guard_pt_booking_snapshot_owner();
