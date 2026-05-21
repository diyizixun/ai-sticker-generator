"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// SVG icons for OAuth providers
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.437h-3.047v-3.416h3.047V9.483c0-3.01 1.792-4.669 4.533-4.669 1.312 0 2.686.236 2.686.236v2.953h-1.513c-1.49 0-1.956.93-1.956 1.886v2.27h3.328l-.532 3.415h-2.796v8.437C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "发送失败");
        setLoading(false);
        return;
      }

      setSuccess("验证码已发送，请查收邮件");
      setStep("verify");
      
      // 开发环境显示验证码
      if (data.code) {
        console.log("开发模式 - 验证码:", data.code);
        setSuccess(`验证码已发送，请查收邮件（开发模式验证码: ${data.code}）`);
      }

      // 开始倒计时（60秒后可重发）
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 验证验证码并登录
  const handleVerifyAndLogin = async () => {
    if (!code || code.length !== 6) {
      setError("请输入6位验证码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "验证失败");
        setLoading(false);
        return;
      }

      // 验证成功，调用 NextAuth 登录
      // 使用 credentials provider 或自定义逻辑
      const result = await signIn("email", { 
        email, 
        callbackUrl: "/settings" 
      });

    } catch {
      setError("验证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="AI Sticker Generator" className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">
            AI Sticker Generator
          </h1>
          <p className="text-gray-500 mt-2">登录以保存贴纸并升级到 Pro</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
          {/* 邮箱登录区域 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">邮箱登录</h3>
            
            {step === "email" ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "发送中..." : "发送验证码"}
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-600">
                  验证码已发送到 <span className="font-medium">{email}</span>
                  <button
                    onClick={() => setStep("email")}
                    className="ml-2 text-purple-600 hover:text-purple-700"
                  >
                    修改
                  </button>
                </div>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                    验证码
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                  />
                </div>
                <button
                  onClick={handleVerifyAndLogin}
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "验证中..." : "登录 / 注册"}
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="w-full text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送验证码"}
                </button>
              </>
            )}

            {/* 错误和成功消息 */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                {success}
              </div>
            )}
          </div>

          {/* 分割线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">或使用第三方登录</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/settings" })}
            className="w-full py-3 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Facebook OAuth */}
          <button
            onClick={() => signIn("facebook", { callbackUrl: "/settings" })}
            className="w-full py-3 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FacebookIcon />
            Continue with Facebook
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
