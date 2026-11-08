// error ที่บอกผู้ใช้ได้ (message = ข้อความภาษาไทย) — ใช้ร่วมกันทั้ง Claude และ Gemini
export class AiError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}
