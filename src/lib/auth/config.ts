// NextAuth v5 配置 - Auth.js
// 支持 OAuth 登录（Google、Facebook）+ 邮箱验证码登录

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { verifyCode } from "@/lib/auth/otp";
import { findUserByEmail, createUser } from "@/lib/db/users";

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

  // 添加邮箱验证码登录
  providers.push(
    Credentials({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const email = credentials.email as string;
        const code = credentials.code as string;

        // 验证验证码
        const isValid = verifyCode(email, code);
        if (!isValid) {
          return null;
        }

        // 查找或创建用户
        let dbUser = await findUserByEmail(email);
        
        if (!dbUser) {
          dbUser = await createUser({
            email,
            name: email.split('@')[0], // 默认用邮箱前缀作为昵称
            provider: 'email',
            provider_id: email,
          });
        }

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          image: null,
          dbId: dbUser.id,
          plan: dbUser.plan,
        } as any;
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
              avatar_url: (user as any).image || undefined,
              provider: account.provider,
              provider_id: account.providerAccountId || user.email,
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
