import { nanoid } from "nanoid";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateQuizCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function generateId(): string {
  return nanoid(12);
}
