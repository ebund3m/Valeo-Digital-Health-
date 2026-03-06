import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging Tailwind classes cleanly
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a date nicely
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  }).format(date);
}

// Format time
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Format currency (USD for SVG market)
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency,
  }).format(amount);
}