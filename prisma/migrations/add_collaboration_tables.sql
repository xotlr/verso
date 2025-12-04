-- Migration: Add Real-Time Collaboration Tables
-- This enables real-time collaboration features across both ProseMirror and Classic editors

-- Table to store screenplay operations for real-time sync
CREATE TABLE IF NOT EXISTS screenplay_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id UUID NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'insert', 'delete', 'replace', 'cursor_move'
  position INTEGER,
  content TEXT,
  metadata JSONB, -- Store editor-specific data
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  sequence_number BIGSERIAL,

  -- Index for fast queries
  INDEX idx_screenplay_ops_screenplay_id (screenplay_id, timestamp DESC),
  INDEX idx_screenplay_ops_sequence (screenplay_id, sequence_number DESC)
);

-- Table to track active collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id UUID NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  editor_type TEXT NOT NULL, -- 'prosemirror' or 'classic'
  cursor_position INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Store user color, name, etc.

  UNIQUE(screenplay_id, user_id),
  INDEX idx_collab_sessions_screenplay (screenplay_id, last_seen DESC)
);

-- Table to store conflict resolution data
CREATE TABLE IF NOT EXISTS collaboration_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screenplay_id UUID NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES screenplay_operations(id) ON DELETE CASCADE,
  conflicting_operation_id UUID REFERENCES screenplay_operations(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_strategy TEXT, -- 'manual', 'auto_merge', 'last_write_wins'
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_conflicts_screenplay (screenplay_id, resolved, created_at DESC)
);

-- Function to clean up old operations (keep last 1000 per screenplay)
CREATE OR REPLACE FUNCTION cleanup_old_operations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM screenplay_operations
  WHERE screenplay_id = NEW.screenplay_id
  AND id NOT IN (
    SELECT id FROM screenplay_operations
    WHERE screenplay_id = NEW.screenplay_id
    ORDER BY sequence_number DESC
    LIMIT 1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup old operations
CREATE TRIGGER trigger_cleanup_operations
AFTER INSERT ON screenplay_operations
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_operations();

-- Function to update last_seen on collaboration sessions
CREATE OR REPLACE FUNCTION update_session_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collaboration_sessions
  SET last_seen = NOW()
  WHERE screenplay_id = NEW.screenplay_id
  AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen when user makes an operation
CREATE TRIGGER trigger_update_last_seen
AFTER INSERT ON screenplay_operations
FOR EACH ROW
EXECUTE FUNCTION update_session_last_seen();

-- Enable Row Level Security
ALTER TABLE screenplay_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see operations for screenplays they have access to
CREATE POLICY "Users can view operations for their screenplays"
ON screenplay_operations FOR SELECT
USING (
  screenplay_id IN (
    SELECT id FROM screenplays WHERE user_id = auth.uid()
    UNION
    SELECT screenplay_id FROM screenplay_collaborators WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert operations for their screenplays"
ON screenplay_operations FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  screenplay_id IN (
    SELECT id FROM screenplays WHERE user_id = auth.uid()
    UNION
    SELECT screenplay_id FROM screenplay_collaborators WHERE user_id = auth.uid()
  )
);

-- Session policies
CREATE POLICY "Users can view sessions for their screenplays"
ON collaboration_sessions FOR SELECT
USING (
  screenplay_id IN (
    SELECT id FROM screenplays WHERE user_id = auth.uid()
    UNION
    SELECT screenplay_id FROM screenplay_collaborators WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own sessions"
ON collaboration_sessions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Conflict policies
CREATE POLICY "Users can view conflicts for their screenplays"
ON collaboration_conflicts FOR SELECT
USING (
  screenplay_id IN (
    SELECT id FROM screenplays WHERE user_id = auth.uid()
    UNION
    SELECT screenplay_id FROM screenplay_collaborators WHERE user_id = auth.uid()
  )
);

-- Comments for documentation
COMMENT ON TABLE screenplay_operations IS 'Stores real-time editing operations for collaborative editing';
COMMENT ON TABLE collaboration_sessions IS 'Tracks active users editing a screenplay';
COMMENT ON TABLE collaboration_conflicts IS 'Logs and resolves editing conflicts';
