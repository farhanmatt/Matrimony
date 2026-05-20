import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInYears, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(dateOfBirth: Date | string): number {
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export const MARITAL_STATUS_LABELS: Record<string, string> = {
  NEVER_MARRIED: "Never Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
  SEPARATED: "Separated",
  AWAITING_DIVORCE: "Awaiting Divorce",
};

export const FAMILY_TYPE_LABELS: Record<string, string> = {
  NUCLEAR: "Nuclear",
  JOINT: "Joint",
  EXTENDED: "Extended",
};

export const FAMILY_STATUS_LABELS: Record<string, string> = {
  MIDDLE_CLASS: "Middle Class",
  UPPER_MIDDLE_CLASS: "Upper Middle Class",
  RICH: "Rich",
  AFFLUENT: "Affluent",
};
