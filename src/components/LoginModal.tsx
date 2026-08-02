"use client";

import { useState } from "react";
import { X, Mail, ArrowRight, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);

  if (!open) return null;

  const sendCode = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    setLoading(true);
    setError("");
    setFallbackCode(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep("verify");
        if (data.devCode) setCode(data.devCode);
        if (data.fallbackCode) setFallbackCode(data.fallbackCode);
      } else {
        setError(data.error || "Failed to send code");
      }
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    if (!code || code.length < 4) {
      setError("Please enter the verification code");
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
      if (res.ok && data.success) {
        onSuccess();
        handleClose();
      } else {
        setError(data.error || "Invalid verification code. Please try again.");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setError("");
    setLoading(false);
    setFallbackCode(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {step === "email" ? "Sign In / Sign Up" : "Verify Email"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {step === "email"
              ? "Enter your email to sign in or create an account"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {fallbackCode && step === "verify" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Email service temporarily unavailable
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Use this verification code to sign in:
                </p>
                <p className="text-2xl font-bold tracking-widest text-purple-600 mt-2 text-center font-mono">
                  {fallbackCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "email" ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
              />
            </div>
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && verifyAndLogin()}
              />
              {code && code.length === 6 && (
                <p className="text-xs text-green-600 mt-1 text-center">6-digit code ready ✓</p>
              )}
            </div>
            <button
              onClick={verifyAndLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify & Sign In <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={() => { setStep("email"); setError(""); setCode(""); setFallbackCode(null); }}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Change email
            </button>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          No password needed — just enter your email!
        </p>
      </div>
    </div>
  );
}
