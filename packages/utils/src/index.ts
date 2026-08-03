export function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
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
