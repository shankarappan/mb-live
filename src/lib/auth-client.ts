import type { UserRole } from "@/lib/types/database";

export function isLeaderOrAdmin(role: UserRole) {
  return role === "admin" || role === "leader";
}
