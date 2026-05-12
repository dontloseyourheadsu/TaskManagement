BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS workspaces
(
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_workspace_id UUID;

INSERT INTO workspaces (id, owner_id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'My Workspace', 'Default workspace', now(), now()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.owner_id = u.id
);

UPDATE users u
SET default_workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = u.id
  AND u.default_workspace_id IS NULL;

ALTER TABLE topics
    ADD COLUMN IF NOT EXISTS workspace_id UUID;

UPDATE topics t
SET workspace_id = u.default_workspace_id
FROM users u
WHERE t.user_id = u.id
  AND t.workspace_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_topics_workspace_id'
    ) THEN
        ALTER TABLE topics
            ADD CONSTRAINT fk_topics_workspace_id
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE topics
    ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE topics
    DROP CONSTRAINT IF EXISTS fk_topics_user_id;

ALTER TABLE topics
    DROP COLUMN IF EXISTS user_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_default_workspace'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_default_workspace
            FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS workspace_share_links
(
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_workspace_id ON topics (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_share_links_workspace_id ON workspace_share_links (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_share_links_token ON workspace_share_links (token);

COMMIT;
