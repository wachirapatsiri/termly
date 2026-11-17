// error ที่บอกผู้ใช้ได้ — ใช้ร่วมกันทั้ง Claude และ Gemini
// message = ข้อความภาษาไทย (ค่าตั้งต้น); ถ้ามี key/vars ให้ route แปลตามภาษาของผู้ใช้ด้วย t(lang, key, vars)
import { t, type MessageKey } from "../messages.ts";

export class AiError extends Error {
  readonly retryable: boolean;
  readonly key?: MessageKey;
  readonly vars?: Record<string, string | number>;
  constructor(
    message: string,
    retryable: boolean,
    i18n?: { key: MessageKey; vars?: Record<string, string | number> },
  ) {
    super(message);
    this.retryable = retryable;
    this.key = i18n?.key;
    this.vars = i18n?.vars;
  }
}

// สร้าง AiError จากคีย์ข้อความ (message เป็นภาษาไทยตามค่าตั้งต้น)
export function aiError(key: MessageKey, retryable: boolean, vars?: Record<string, string | number>) {
  return new AiError(t("th", key, vars), retryable, { key, vars });
}
