-- Create profiles table to extend auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT 'STEM enthusiast looking to explore new opportunities.',
  interests TEXT[] DEFAULT ARRAY['Computer Science', 'Mathematics', 'Robotics'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_points INTEGER DEFAULT 0,
  achievement_count INTEGER DEFAULT 0
);

-- Create a function that creates a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that calls the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL, -- e.g., quiz, learning, engagement
  points INTEGER NOT NULL DEFAULT 10,
  required_points INTEGER DEFAULT 0, -- Points needed in category to earn this achievement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user achievements junction table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

-- Create user progress table for tracking progress in different categories
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL, -- e.g., quiz, learning, engagement
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, category)
);

-- Create bookmarks table for saved courses/resources
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL, -- e.g., course, video, article
  resource_id TEXT NOT NULL, -- ID of the resource in its respective system
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, resource_type, resource_id)
);

-- Create quiz results table
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_type TEXT NOT NULL, -- e.g., career, knowledge
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  recommendations JSONB, -- Store quiz-specific recommendations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function for incrementing values
CREATE OR REPLACE FUNCTION increment(x INTEGER)
RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS $$
  SELECT x + 1;
$$;

-- Row Level Security Policies

-- Profiles: Users can read all profiles but only update their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Achievements: Anyone can read achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone."
  ON public.achievements FOR SELECT
  USING (true);

-- User Achievements: Users can read their own achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements."
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- User Progress: Users can read and update their own progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress."
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress."
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Bookmarks: Users can manage their own bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks."
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks."
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks."
  ON public.bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks."
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Quiz Results: Users can view their own quiz results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz results."
  ON public.quiz_results FOR SELECT
  USING (auth.uid() = user_id);

-- Calendar Events: Users can manage their own calendar events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar events."
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events."
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events."
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events."
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Sample Achievements Data (Uncomment to insert)
/*
INSERT INTO public.achievements (name, description, icon, category, points, required_points) VALUES
('First Login', 'Logged in for the first time', '🎉', 'engagement', 10, 0),
('Profile Completed', 'Completed your profile information', '👤', 'engagement', 20, 0),
('Career Explorer', 'Completed the career quiz', '🧭', 'quiz', 30, 0),
('Achievement Hunter', 'Earned 5 achievements', '🏆', 'engagement', 50, 0),
('Learning Beginner', 'Completed your first course', '📚', 'learning', 25, 1),
('Learning Enthusiast', 'Completed 5 courses', '📚', 'learning', 100, 5),
('Learning Master', 'Completed 10 courses', '🎓', 'learning', 200, 10),
('Quiz Champion', 'Scored 100% on any quiz', '🏅', 'quiz', 50, 0),
('Resource Collector', 'Bookmarked 10 resources', '📌', 'engagement', 30, 10),
('Regular Visitor', 'Logged in for 7 consecutive days', '📅', 'engagement', 40, 7);
*/ 