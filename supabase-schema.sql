-- ============================================================
-- Guided School Ecosystem — Supabase Schema
-- ============================================================
-- Run these statements in the Supabase SQL editor to set up
-- the tables required for the school integration feature.
-- ============================================================

-- Classes: groups of students within a school
CREATE TABLE IF NOT EXISTS classes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  grade_level  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_school_id_idx ON classes(school_id);

-- Class enrolments: many-to-many between classes and students
CREATE TABLE IF NOT EXISTS class_students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS class_students_class_id_idx   ON class_students(class_id);
CREATE INDEX IF NOT EXISTS class_students_student_id_idx ON class_students(student_id);

-- Teachers: staff accounts for a school
CREATE TABLE IF NOT EXISTS teachers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  pin        TEXT NOT NULL,
  subjects   TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teachers_school_id_idx ON teachers(school_id);

-- Lessons: log entries created by teachers
CREATE TABLE IF NOT EXISTS lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content     TEXT NOT NULL,
  homework    TEXT,
  materials   JSONB,   -- { filename, data (base64), type }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_teacher_id_idx  ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS lessons_class_id_idx    ON lessons(class_id);
CREATE INDEX IF NOT EXISTS lessons_lesson_date_idx ON lessons(lesson_date);

-- Year plans: one per (class, subject), upserted by teachers
CREATE TABLE IF NOT EXISTS year_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  plan_text   TEXT,
  plan_file   JSONB,   -- { filename, data (base64), type }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject)
);

CREATE INDEX IF NOT EXISTS year_plans_teacher_id_idx ON year_plans(teacher_id);
CREATE INDEX IF NOT EXISTS year_plans_class_id_idx   ON year_plans(class_id);

-- ============================================================
-- Per-Subject History — isolates data per student per subject
-- ============================================================
-- Replaces the single history[] blob on guided_accounts/family_members.
-- Each subject gets its own row with chat history, Slack context,
-- AI tutor notes, weakness tracking, and homework info.

CREATE TABLE IF NOT EXISTS subject_histories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Polymorphic owner: exactly one of these will be set
  account_id        UUID REFERENCES guided_accounts(id) ON DELETE CASCADE,
  family_member_id  UUID REFERENCES family_members(id) ON DELETE CASCADE,
  student_id        UUID REFERENCES students(id) ON DELETE CASCADE,

  subject           TEXT NOT NULL,                      -- e.g. "Mathematik", "Deutsch"
  messages          JSONB NOT NULL DEFAULT '[]',        -- [{role, content, ts}]
  message_count     INTEGER NOT NULL DEFAULT 0,         -- denormalized for pagination
  slack_channel_id  TEXT DEFAULT '',                     -- linked Slack channel ID
  slack_context     TEXT DEFAULT '',                     -- formatted Slack content for this subject
  ai_notes          TEXT DEFAULT '',                     -- per-subject tutor handover notes
  weaknesses        TEXT DEFAULT '',                     -- per-subject weakness tracking
  homework_info     TEXT DEFAULT '',                     -- extracted homework for this subject
  bloom_data        JSONB DEFAULT '{}',                 -- per-subject Bloom's taxonomy counts

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each owner can have at most one row per subject
  UNIQUE (account_id, subject),
  UNIQUE (family_member_id, subject),
  UNIQUE (student_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_sh_account  ON subject_histories(account_id)  WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sh_family   ON subject_histories(family_member_id) WHERE family_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sh_student  ON subject_histories(student_id)  WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sh_subject  ON subject_histories(subject);

-- RPC: paginated history loading for a subject
-- Returns { messages: [...], total: N, hasMore: bool }
CREATE OR REPLACE FUNCTION get_subject_history_page(
  p_owner_type TEXT,      -- 'account', 'family_member', or 'student'
  p_owner_id   UUID,
  p_subject    TEXT,
  p_offset     INTEGER DEFAULT 0,
  p_limit      INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_messages JSONB;
  v_total    INTEGER;
  v_page     JSONB;
BEGIN
  -- Find the subject_histories row for this owner+subject
  IF p_owner_type = 'account' THEN
    SELECT messages, message_count INTO v_messages, v_total
    FROM subject_histories WHERE account_id = p_owner_id AND subject = p_subject;
  ELSIF p_owner_type = 'family_member' THEN
    SELECT messages, message_count INTO v_messages, v_total
    FROM subject_histories WHERE family_member_id = p_owner_id AND subject = p_subject;
  ELSE
    SELECT messages, message_count INTO v_messages, v_total
    FROM subject_histories WHERE student_id = p_owner_id AND subject = p_subject;
  END IF;

  IF v_messages IS NULL OR v_total = 0 THEN
    RETURN jsonb_build_object('messages', '[]'::jsonb, 'total', 0, 'hasMore', false);
  END IF;

  -- Messages stored oldest-first. Return the NEWEST p_limit messages,
  -- offset from the end (p_offset = 0 means the most recent page).
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_page
  FROM (
    SELECT elem
    FROM jsonb_array_elements(v_messages) WITH ORDINALITY AS t(elem, ord)
    ORDER BY ord DESC
    OFFSET p_offset
    LIMIT p_limit
  ) sub;

  RETURN jsonb_build_object(
    'messages', v_page,
    'total', v_total,
    'hasMore', (p_offset + p_limit) < v_total
  );
END;
$$;
