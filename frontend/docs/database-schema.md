# Database Schema Documentation

This document outlines the database schema for the EduMatch platform using Supabase PostgreSQL.

## Tables

### profiles
Stores user profile information for students, teachers, and admins.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  proficiency_level TEXT CHECK (proficiency_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### schools
Stores school/institution information.

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools are viewable by members" ON schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.school_id = schools.id
      AND profiles.id = auth.uid()
    )
  );
```

### matches
Stores conversation matching sessions between students.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended', 'cancelled')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_students CHECK (student1_id != student2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their matches" ON matches
  FOR SELECT USING (
    auth.uid() = student1_id OR auth.uid() = student2_id
  );
```

### messages
Stores chat messages within conversation sessions.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'system', 'correction')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their matches" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their matches" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
      AND matches.status = 'active'
    )
  );
```

### curriculum_topics
Stores curriculum topics and grammar focuses for schools.

```sql
CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grammar_focus TEXT[],
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics viewable by school members" ON curriculum_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.school_id = curriculum_topics.school_id
      AND profiles.id = auth.uid()
    )
  );
```

### feedback_logs
Stores AI-generated feedback for student sessions.

```sql
CREATE TABLE feedback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  grammar_patterns JSONB,
  vocabulary_themes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE feedback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their feedback" ON feedback_logs
  FOR SELECT USING (auth.uid() = student_id);
```

## Realtime Subscriptions

Enable realtime for messages table:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## Functions

### Update timestamp function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Run the SQL statements above in the Supabase SQL Editor
3. Copy your project URL and anon key to `.env.local`
4. Enable Email authentication in Supabase Auth settings
5. Configure realtime settings for the `messages` table

## Migration Scripts

For production deployments, use Supabase CLI migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Create migration
supabase migration new init_schema

# Apply migrations
supabase db push
```
