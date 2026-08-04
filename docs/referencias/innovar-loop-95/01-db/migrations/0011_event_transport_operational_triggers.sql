BEGIN;
CREATE OR REPLACE FUNCTION enforce_outbox_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.published_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'published outbox record is immutable'; END IF;
 IF NEW.attempt_count < OLD.attempt_count THEN RAISE EXCEPTION 'attempt_count cannot decrease'; END IF;
 IF NEW.next_attempt_at IS NOT NULL AND NEW.published_at IS NOT NULL THEN RAISE EXCEPTION 'published record cannot remain scheduled'; END IF;
 RETURN NEW;
END $$;
DO $$ BEGIN IF to_regclass('public.event_outbox') IS NOT NULL THEN
 DROP TRIGGER IF EXISTS trg_event_outbox_transition ON event_outbox;
 CREATE TRIGGER trg_event_outbox_transition BEFORE UPDATE ON event_outbox FOR EACH ROW EXECUTE FUNCTION enforce_outbox_transition();
END IF; END $$;
COMMIT;
