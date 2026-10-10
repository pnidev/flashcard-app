import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// TẠO FILE .env hoặc ĐIỀN TRỰC TIẾP URL & KEY VÀO ĐÂY
const supabaseUrl = 'https://tjnrnmzrqpxbdgbyzajs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqbnJubXpycXB4YmRnYnl6YWpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTYxNzAxNywiZXhwIjoyMTA3MTkzMDE3fQ.J0yiFdig7kyev4xz_MJP4ybVFq7BvxEwA191sn-kX_A';
// Lưu ý: Dùng service_role_key (trong mục Project Settings -> API) để có quyền insert bỏ qua RLS

const supabase = createClient(supabaseUrl, supabaseKey);

// Đọc data từ file JSON
const rawData = fs.readFileSync('./src/data/cauhoi.json', 'utf8');
const questions = JSON.parse(rawData);

async function uploadData() {
  console.log(`Đang chuẩn bị đẩy ${questions.length} câu hỏi lên Supabase...`);

  // Chia lô (chunk) mỗi lần đẩy 100 câu để tránh timeout/quá tải
  const chunkSize = 100;
  for (let i = 0; i < questions.length; i += chunkSize) {
    const chunk = questions.slice(i, i + chunkSize);

    const chunkToUpload = chunk.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.answer
    }));

    const { error } = await supabase
      .from('questions')
      .upsert(chunkToUpload); // upsert: nếu id đã có thì cập nhật, chưa có thì thêm mới

    if (error) {
      console.error(`❌ Lỗi ở lô từ ${i} đến ${i + chunkSize}:`, error);
      return;
    }
    console.log(`✅ Đã đẩy thành công lô từ ${i} đến ${i + chunk.length - 1}`);
  }

  console.log('🎉 HOÀN TẤT ĐẨY DỮ LIỆU LÊN SUPABASE!');
}

uploadData();
