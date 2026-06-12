"use client";

import { useState, useEffect } from "react";

export function LoginButton() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(d => setSession(d.email));
  }, []);

  const sendCode = async () => {
    if (!email.includes("@")) {
      setMessage("请输入有效的邮箱地址");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setStep("code");
      setMessage("验证码已发送到 " + email);
    } else {
      const d = await res.json();
      setMessage(d.error || "发送失败");
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setMessage("请输入 6 位验证码");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setLoading(false);
    if (res.ok) {
      setSession(email);
      setMessage("");
    } else {
      const d = await res.json();
      setMessage(d.error || "验证失败");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSession(null);
    setStep("email");
    setEmail("");
    setCode("");
  };

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{session}</span>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-red-500 transition"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          const modal = document.getElementById("login-modal");
          if (modal) modal.classList.toggle("hidden");
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
      >
        登录
      </button>

      <div id="login-modal" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">登录 AI Sticker</h3>
            <button
              onClick={() => document.getElementById("login-modal")?.classList.add("hidden")}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {step === "email" ? (
            <div className="space-y-4">
              <input
                type="email"
                placeholder="输入你的邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => e.key === "Enter" && sendCode()}
              />
              <button
                onClick={sendCode}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? "发送中..." : "发送验证码"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">验证码已发送到 {email}</p>
              <input
                type="text"
                placeholder="输入 6 位验证码"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={6}
                onKeyDown={e => e.key === "Enter" && verifyCode()}
              />
              <button
                onClick={verifyCode}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? "验证中..." : "确认登录"}
              </button>
              <button
                onClick={() => { setStep("email"); setMessage(""); }}
                className="w-full text-sm text-gray-400 hover:text-indigo-600 transition"
              >
                ← 重新输入邮箱
              </button>
            </div>
          )}

          {message && (
            <p className={`mt-4 text-sm ${message.includes("已发送") ? "text-green-600" : "text-red-500"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
