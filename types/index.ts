import type { DefaultSession } from "next-auth";

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

// JWT type augmentation — handled in lib/auth.ts callback types

// ─── App Types ────────────────────────────────────────────────────────────────

export type ProfileWithPhotos = {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date;
  height: number | null;
  maritalStatus: string;
  education: string | null;
  profession: string | null;
  income: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  bio: string | null;
  religion: string | null;
  caste: string | null;
  language: string | null;
  status: string;
  photos: { id: string; url: string; isPrimary: boolean }[];
};

export type MatchWithProfiles = {
  id: string;
  profileAId: string;
  profileBId: string;
  createdAt: Date;
  profileA: ProfileWithPhotos;
  profileB: ProfileWithPhotos;
  unlocks: { id: string; userId: string }[];
};

export type AdminStats = {
  totalUsers: number;
  totalProfiles: number;
  totalMatches: number;
  totalPayments: number;
  totalRevenue: number;
  activeProfiles: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProfileFilters = {
  gender?: string;
  religion?: string;
  location?: string;
  maritalStatus?: string;
  ageMin?: number;
  ageMax?: number;
  page?: number;
  limit?: number;
};
