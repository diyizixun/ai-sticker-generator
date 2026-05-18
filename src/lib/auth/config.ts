// NextAuth v5 配置 - Auth.js
// 支持无key构建：OAuth未配置时自动降级为仅邮箱登录

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";

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

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
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

  // 邮箱快捷登录（始终可用）
  providers.push(
    Credentials({
      name: "email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // 动态导入避免构建时依赖数据库
        try {
          const { findUserByEmail, createUser } = await import("@/lib/db/users");
          let user = await findUserByEmail(credentials.email as string);
          if (!user) {
            user = await createUser({
              email: credentials.email as string,
              name: (credentials.email as string).split("@")[0],
            });
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar_url,
          };
        } catch {
          // 数据库未配置时，返回临时用户
          return {
            id: `temp-${credentials.email}`,
            email: credentials.email as string,
            name: (credentials.email as string).split("@")[0],
          };
        }
      },
    })
  );

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).id = token.dbId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
