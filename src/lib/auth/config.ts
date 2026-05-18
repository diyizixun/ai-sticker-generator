// NextAuth v5 配置 - Auth.js
// 仅支持 OAuth 登录（Google、Facebook），移除不安全的邮箱登录

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";

// 动态构建providers，没配key的自动跳过
function getProviders() {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      Facebook({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      })
    );
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: getProviders(),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && user.email) {
        try {
          const { findUserByEmail, createUser } = await import("@/lib/db/users");
          let dbUser = await findUserByEmail(user.email);
          if (!dbUser) {
            dbUser = await createUser({
              email: user.email,
              name: user.name || undefined,
              avatar_url: user.image || undefined,
              provider: account.provider,
              provider_id: account.providerAccountId,
            });
          }
          (user as any).dbId = dbUser.id;
          (user as any).plan = dbUser.plan;
        } catch {
          // DB不可用时继续
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.dbId = (user as any).dbId || (user as any).id;
        token.plan = (user as any).plan || "free";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.dbId;
        (session.user as any).plan = token.plan;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 登录后跳转到 /settings
      if (url.startsWith(baseUrl)) return url;
      if (url.includes("/api/auth/callback")) return "/settings";
      return "/settings";
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
});
