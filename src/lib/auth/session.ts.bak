// 获取当前登录用户（服务端用）
import { auth } from "@/lib/auth/config";
import { findUserById, findUserByEmail } from "@/lib/db/users";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = (session.user as any).id;
  if (typeof userId === "string" && userId.length === 36) {
    // UUID格式，直接查数据库
    return findUserById(userId);
  }

  // 降级：通过email查
  if (session.user.email) {
    return findUserByEmail(session.user.email);
  }

  return null;
}

// 获取当前用户ID（轻量，不查数据库）
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return (session.user as any).id || null;
}
