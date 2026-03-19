-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMs
CREATE TYPE user_role AS ENUM ('trainer', 'member');
CREATE TYPE subscription_status_enum AS ENUM ('active', 'canceled', 'past_due');
CREATE TYPE trainer_member_status AS ENUM ('active', 'inactive');
CREATE TYPE file_type AS ENUM ('audio', 'text');
CREATE TYPE pipeline_status AS ENUM ('queued', 'transcribing', 'structuring', 'pending_review', 'confirmed', 'failed');
CREATE TYPE session_status AS ENUM ('pending', 'confirmed', 'completed');
CREATE TYPE photo_type AS ENUM ('front', 'side', 'back');
CREATE TYPE suggestion_status AS ENUM ('pending', 'accepted', 'modified', 'rejected');

-- 1. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  stripe_customer_id TEXT,
  subscription_status subscription_status_enum DEFAULT 'active',
  terms_agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. trainer_members
CREATE TABLE trainer_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status trainer_member_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trainer_id, member_id)
);

-- 3. counseling_personality
CREATE TABLE counseling_personality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB,
  training_style TEXT,
  coaching_tips JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. counseling_body
CREATE TABLE counseling_body (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concerns JSONB,
  medical_history TEXT,
  goals JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. counseling_diet
CREATE TABLE counseling_diet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_frequency INTEGER,
  meal_times JSONB,
  dietary_notes TEXT,
  allergies JSONB,
  improvement_goals TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. exercises
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 7. inbox_files
CREATE TABLE inbox_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_type file_type NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 8. pipeline_jobs
CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inbox_file_id UUID NOT NULL REFERENCES inbox_files(id) ON DELETE CASCADE,
  route file_type NOT NULL,
  status pipeline_status NOT NULL DEFAULT 'queued',
  whisper_result TEXT,
  structured_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. workout_sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pipeline_job_id UUID REFERENCES pipeline_jobs(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  status session_status NOT NULL DEFAULT 'pending',
  voice_audio_url TEXT,
  voice_transcript TEXT,
  trainer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. session_sets
CREATE TABLE session_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(6,2),
  reps INTEGER,
  notes TEXT
);

-- 11. body_photos
CREATE TABLE body_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL,
  google_drive_file_id TEXT,
  google_drive_folder_id TEXT,
  photo_type photo_type NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. body_weight
CREATE TABLE body_weight (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_kg NUMERIC(5,2) NOT NULL,
  notes TEXT
);

-- 13. ai_menu_suggestions
CREATE TABLE ai_menu_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_for_date DATE NOT NULL,
  suggestion JSONB NOT NULL,
  reasoning TEXT,
  status suggestion_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan_name TEXT,
  amount NUMERIC(10,2),
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trainer_members_trainer ON trainer_members(trainer_id);
CREATE INDEX idx_trainer_members_member ON trainer_members(member_id);
CREATE INDEX idx_workout_sessions_member ON workout_sessions(member_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(session_date);
CREATE INDEX idx_session_sets_session ON session_sets(session_id);
CREATE INDEX idx_body_weight_member ON body_weight(member_id);
CREATE INDEX idx_body_photos_member ON body_photos(member_id);
CREATE INDEX idx_inbox_files_member ON inbox_files(member_id);
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_ai_suggestions_member ON ai_menu_suggestions(member_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pipeline_jobs_updated_at BEFORE UPDATE ON pipeline_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ RLS ============
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_body ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_diet ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weight ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_menu_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is trainer for a member
CREATE OR REPLACE FUNCTION is_trainer_for(p_member_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trainer_members
    WHERE trainer_id = auth.uid()
    AND member_id = p_member_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Trainers can view their members" ON users FOR SELECT USING (
  get_user_role() = 'trainer' AND (
    id = auth.uid() OR
    EXISTS (SELECT 1 FROM trainer_members WHERE trainer_id = auth.uid() AND member_id = users.id AND status = 'active')
  )
);

-- trainer_members policies
CREATE POLICY "Trainers can view own assignments" ON trainer_members FOR SELECT USING (trainer_id = auth.uid());
CREATE POLICY "Trainers can manage assignments" ON trainer_members FOR ALL USING (trainer_id = auth.uid());

-- counseling policies
CREATE POLICY "Members view own counseling_personality" ON counseling_personality FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage counseling_personality" ON counseling_personality FOR ALL USING (is_trainer_for(member_id));

CREATE POLICY "Members view own counseling_body" ON counseling_body FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage counseling_body" ON counseling_body FOR ALL USING (is_trainer_for(member_id));

CREATE POLICY "Members view own counseling_diet" ON counseling_diet FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage counseling_diet" ON counseling_diet FOR ALL USING (is_trainer_for(member_id));

-- exercises policies
CREATE POLICY "Authenticated users view exercises" ON exercises FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Trainers can create exercises" ON exercises FOR INSERT WITH CHECK (get_user_role() = 'trainer');

-- inbox_files policies
CREATE POLICY "Trainers manage inbox_files" ON inbox_files FOR ALL USING (uploaded_by = auth.uid() OR is_trainer_for(member_id));

-- pipeline_jobs policies
CREATE POLICY "Trainers view pipeline_jobs" ON pipeline_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM inbox_files WHERE inbox_files.id = pipeline_jobs.inbox_file_id AND (inbox_files.uploaded_by = auth.uid() OR is_trainer_for(inbox_files.member_id)))
);
CREATE POLICY "Trainers update pipeline_jobs" ON pipeline_jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM inbox_files WHERE inbox_files.id = pipeline_jobs.inbox_file_id AND is_trainer_for(inbox_files.member_id))
);

-- workout_sessions policies
CREATE POLICY "Members view own sessions" ON workout_sessions FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage sessions" ON workout_sessions FOR ALL USING (trainer_id = auth.uid() OR is_trainer_for(member_id));

-- session_sets policies
CREATE POLICY "Members view own sets" ON session_sets FOR SELECT USING (
  EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_sets.session_id AND workout_sessions.member_id = auth.uid())
);
CREATE POLICY "Trainers manage sets" ON session_sets FOR ALL USING (
  EXISTS (SELECT 1 FROM workout_sessions WHERE workout_sessions.id = session_sets.session_id AND workout_sessions.trainer_id = auth.uid())
);

-- body_photos policies
CREATE POLICY "Members view own photos" ON body_photos FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage photos" ON body_photos FOR ALL USING (is_trainer_for(member_id));

-- body_weight policies
CREATE POLICY "Members manage own weight" ON body_weight FOR ALL USING (member_id = auth.uid());
CREATE POLICY "Trainers view member weight" ON body_weight FOR SELECT USING (is_trainer_for(member_id));

-- ai_menu_suggestions policies
CREATE POLICY "Members view own suggestions" ON ai_menu_suggestions FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Trainers manage suggestions" ON ai_menu_suggestions FOR ALL USING (trainer_id = auth.uid() OR is_trainer_for(member_id));

-- subscriptions policies
CREATE POLICY "Members view own subscription" ON subscriptions FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Service role manages subscriptions" ON subscriptions FOR ALL USING (auth.uid() IS NOT NULL);
