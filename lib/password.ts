/** Password rules shared by the change-password form and the Admin's user forms. */
export const PASSWORD_RULES = "At least 10 characters, including a letter and a number.";

/** An error message, or null if the password is acceptable. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters";
  if (pw.length > 200) return "Use at most 200 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number";
  return null;
}
