import { getAdminEmails } from "@motionly/config";

export function isMotionlyAdmin(email: string) {
  return getAdminEmails().includes(email.trim().toLocaleLowerCase("en"));
}
