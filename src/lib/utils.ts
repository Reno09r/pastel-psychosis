import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function detectOS() {
  if (typeof window === "undefined") return "Unknown";
  const userAgent = window.navigator.userAgent;
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac/i.test(userAgent)) return "Mac";
  if (/Linux/i.test(userAgent)) return "Linux";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iOS/i.test(userAgent)) return "iOS";
  return "Unknown";
}
