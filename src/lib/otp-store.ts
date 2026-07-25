interface OtpRecord {
  code: string;
  expiresAt: number;
  used: boolean;
}

export const otpStore = new Map<string, OtpRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);
