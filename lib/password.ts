/** Password rules shared by the change-password form and the Admin's user forms. */
export const PASSWORD_RULES = "At least 10 characters, including a letter and a number.";

export type PasswordProblem = "tooShort" | "tooLong" | "needsLetterAndNumber";

/** What's wrong with a password, or null if it is acceptable. */
export function passwordProblemCode(pw: string): PasswordProblem | null {
  if (pw.length < 10) return "tooShort";
  if (pw.length > 200) return "tooLong";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "needsLetterAndNumber";
  return null;
}

const MESSAGES: Record<PasswordProblem, string> = {
  tooShort: "Use at least 10 characters",
  tooLong: "Use at most 200 characters",
  needsLetterAndNumber: "Include at least one letter and one number",
};

/** English error message (admin portal), or null if the password is acceptable. */
export function passwordProblem(pw: string): string | null {
  const code = passwordProblemCode(pw);
  return code && MESSAGES[code];
}
