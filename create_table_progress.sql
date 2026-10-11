-- SQL tạo bảng lưu tiến trình học tập của người dùng trên Supabase
-- Bạn chỉ cần copy toàn bộ nội dung file này dán vào SQL Editor trên Supabase Dashboard và bấm RUN!

CREATE TABLE IF NOT EXISTS public.user_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter TEXT NOT NULL,
  mode TEXT NOT NULL,
  round_index INT NOT NULL DEFAULT 0,
  queue_ids INT[] DEFAULT '{}',
  total INT NOT NULL DEFAULT 10,
  is_completed_all BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, chapter, mode)
);

-- Bật bảo mật hàng (Row Level Security)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Cho phép người dùng đã đăng nhập tự xem và cập nhật tiến trình của chính họ
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
CREATE POLICY "Users can manage own progress"
  ON public.user_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
