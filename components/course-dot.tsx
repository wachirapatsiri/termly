import { courseColor } from "@/lib/course-color";

// จุดสีประจำวิชา (ใช้ได้ทั้ง server และ client component)
export function CourseDot({
  course,
  className = "h-2 w-2",
}: {
  course: { id: string; color?: number | null };
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: courseColor(course) }}
    />
  );
}
