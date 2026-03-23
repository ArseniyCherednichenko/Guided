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
