// รูปแบบข้อมูลตามตารางใน supabase/migrations/ (0001_init.sql, 0002_exams_and_categories.sql)

export type Course = {
  id: string;
  name: string;
  code: string | null;
};

export type TaskCategory = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  course_id: string | null;
  category_id: string | null;
  title: string;
  due_at: string | null; // ISO string; null = ยังไม่กำหนดวันส่ง
  due_has_time: boolean;
  notes: string | null;
  source: "manual" | "ai";
  done: boolean;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  course_id: string | null;
  title: string;
  kind: "exam" | "class" | "activity" | "other";
  exam_type: "midterm" | "final" | "other" | null;
  starts_at: string | null; // null = ยังไม่ประกาศวัน
  ends_at: string | null;
  has_time: boolean;
  location: string | null;
  notes: string | null;
  created_at: string;
};
