import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "IDR"): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

export function formatNumber(num: number): string {
    return new Intl.NumberFormat("id-ID").format(num);
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
}

export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
}
export function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Parse currency string to number.
 * Handles "Rp 1.000.000", "Rp1.000.000", "1000000", "1,000,000" etc.
 */
export function parseCurrency(value: string): number {
    if (typeof value !== 'number') {
        return Number(String(value).replace(/[^0-9,-]/g, '').replace(',', '.')) || 0;
    }
    return value;
}

/**
 * Safe number to fixed decimal string.
 * Avoids floating point display issues like 0.10000000000000001
 */
export function toFixed(value: number, decimals: number = 2): string {
    return Number(value).toFixed(decimals);
}

/**
 * Round a monetary value to avoid floating point precision issues.
 * Uses Math.round to avoid issues like 19.999999999999996
 */
export function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}

