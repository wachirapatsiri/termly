// รูปแบบข้อมูลตามตารางใน supabase/migrations/0001_init.sql

export type Course = {
  id: string;
  name: string;
  code: string | null;
};

export type Task = {
  id: string;
  course_id: string | null;
  title: string;
  due_at: string | null; // ISO string; null = ยังไม่กำหนดวันส่ง
  due_has_time: boolean;
  notes: string | null;
  source: "manual" | "ai";
  done: boolean;
  created_at: string;
};
