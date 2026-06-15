// NextAuth v5 配置 - 临时禁用 DB 依赖版本
// 仅用于让服务器启动，完整的 auth 功能在 auth.bak 中保留

import NextAuth from "next-auth";

// 临时空的 auth 配置 - 不导入任何 DB 模块
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    async session() {
      return {} as any;
    },
  },
});

// 临时空函数，避免其他文件导入时报错
export async function getServerSession() {
  return null;
}
