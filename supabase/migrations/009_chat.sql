-- message_threads: one thread per proposal
CREATE TABLE IF NOT EXISTS message_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES advertiser_proposals(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id)
);

-- chat_messages: individual messages in a thread
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('creator', 'brand')),
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages   ENABLE ROW LEVEL SECURITY;

-- Threads: accessible by creator OR the advertiser who owns the proposal
CREATE POLICY "threads_access" ON message_threads FOR ALL
USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM advertiser_proposals
    WHERE id = message_threads.proposal_id
      AND advertiser_id = auth.uid()
  )
);

-- Messages: accessible if the user can access the parent thread
CREATE POLICY "messages_access" ON chat_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM message_threads mt
    WHERE mt.id = chat_messages.thread_id
      AND (
        mt.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM advertiser_proposals ap
          WHERE ap.id = mt.proposal_id
            AND ap.advertiser_id = auth.uid()
        )
      )
  )
);

-- Auto-update last_message_at on insert
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE message_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_last_message();

-- Enable Realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
