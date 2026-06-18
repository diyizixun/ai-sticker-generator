// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GenerateApiResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  provider?: string;
  generationTimeMs?: number;
  quota?: {
    allowed: boolean;
    remaining: number;
    plan: "free" | "pro";
  };
  upgradeUrl?: string;
}

export interface CheckoutApiResponse {
  url?: string;
  error?: string;
}

export interface UserApiResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: "free" | "pro";
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    totalGenerations: number;
    createdAt: string;
  };
  quota: {
    allowed: boolean;
    remaining: number;
    plan: "free" | "pro";
  };
  generations: Array<{
    id: string;
    prompt: string;
    style: string;
    imageUrl: string | null;
    createdAt: string;
  }>;
}

export interface AdminStatsResponse {
  stats: {
    totalUsers: number;
    proUsers: number;
    freeUsers: number;
    totalGenerations: number;
    todayGenerations: number;
    monthlyRevenueCents: number;
    conversionRate: number;
  };
  dailyStats: Array<{
    date: string;
    generations: number;
    newUsers: number;
    revenueCents: number;
  }>;
}
