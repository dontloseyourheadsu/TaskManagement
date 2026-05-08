-- Create task_type enum
CREATE TYPE task_type AS ENUM
('work', 'personal', 'meeting', 'deadline', 'event');

-- Create users table
CREATE TABLE
IF NOT EXISTS users
(
    id UUID PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    username VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    theme VARCHAR NOT NULL DEFAULT 'purple-dark',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create topics table
CREATE TABLE
IF NOT EXISTS topics
(
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
    name VARCHAR
NOT NULL,
    description TEXT,
    color VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create tasks table
CREATE TABLE
IF NOT EXISTS tasks
(
    id UUID PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES topics
(id) ON
DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    task_type task_type
NOT NULL,
    color VARCHAR NOT NULL,
    urgent BOOLEAN NOT NULL DEFAULT FALSE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    recurrence_type VARCHAR, -- 'daily', 'weekly', 'monthly', or NULL
    recurrence_interval INTEGER,
    recurrence_days INTEGER[], -- e.g., [1,3,5] for Mon,Wed,Fri
    recurrence_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create task_exceptions table
CREATE TABLE
IF NOT EXISTS task_exceptions
(
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks
(id) ON
DELETE CASCADE,
    original_date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE
(task_id, original_date)
);

-- Create task_substeps table
CREATE TABLE
IF NOT EXISTS task_substeps
(
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks
(id) ON
DELETE CASCADE,
    description TEXT
NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- Create indices for better performance
CREATE INDEX
IF NOT EXISTS idx_topics_user_id ON topics
(user_id);
CREATE INDEX
IF NOT EXISTS idx_tasks_topic_id ON tasks
(topic_id);
CREATE INDEX
IF NOT EXISTS idx_tasks_start_time ON tasks
(start_time);
CREATE INDEX
IF NOT EXISTS idx_tasks_completed ON tasks
(completed);
CREATE INDEX
IF NOT EXISTS idx_task_substeps_task_id ON task_substeps
(task_id);
CREATE INDEX
IF NOT EXISTS idx_task_substeps_completed ON task_substeps
(completed);
