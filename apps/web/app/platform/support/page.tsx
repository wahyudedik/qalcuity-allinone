"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
    HeadphonesIcon,
    Search,
    MessageSquare,
    Clock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    ChevronDown,
    Send,
    User,
    Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SupportTicket {
    id: string;
    tenant: string;
    subject: string;
    message: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    createdAt: string;
    updatedAt: string;
    replies: TicketReply[];
}

interface TicketReply {
    id: string;
    author: string;
    role: "admin" | "tenant";
    message: string;
    createdAt: string;
}

// ─── API Data ────────────────────────────────────────────────────────────────
// Tickets are now fetched from /api/platform/support/tickets

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SupportTicket["status"] }) {
    const config = {
        open: { icon: AlertTriangle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
        in_progress: { icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
        resolved: { icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        closed: { icon: XCircle, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
    };
    const { icon: Icon, color } = config[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
            <Icon className="h-3 w-3" />
            {status.replace("_", " ")}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: SupportTicket["priority"] }) {
    const colors = {
        critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority]}`}>
            {priority}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlatformSupportPage() {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus !== "all") params.set("status", filterStatus);
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`/api/platform/support/tickets?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setTickets(data.data);
            } else {
                setToast({ message: data.error || t('platform.supportPage.errorFetch'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.supportPage.errorContact'), type: "error" });
        } finally {
            setLoading(false);
        }
    }, [filterStatus, searchQuery, t]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const filteredTickets = tickets.filter((t) => {
        const matchSearch = searchQuery === "" ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.tenant.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = filterStatus === "all" || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const handleSendReply = async () => {
        if (!selectedTicket || !replyMessage.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`/api/platform/support/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: `Reply ke: ${selectedTicket.subject}`,
                    message: replyMessage,
                    priority: "medium",
                    category: "Reply",
                }),
            });
            const data = await res.json();
            if (data.success) {
                const newReply: TicketReply = {
                    id: data.data.id || `r${Date.now()}`,
                    author: "Platform Admin",
                    role: "admin",
                    message: replyMessage,
                    createdAt: new Date().toLocaleString("id-ID"),
                };
                setTickets((prev) =>
                    prev.map((t) =>
                        t.id === selectedTicket.id
                            ? { ...t, replies: [...t.replies, newReply], status: "in_progress" as const, updatedAt: new Date().toLocaleString("id-ID") }
                            : t
                    )
                );
                setSelectedTicket({
                    ...selectedTicket,
                    replies: [...selectedTicket.replies, newReply],
                    status: "in_progress",
                });
                setReplyMessage("");
                setToast({ message: t('platform.supportPage.successReplySent'), type: "success" });
            } else {
                setToast({ message: data.error || t('platform.supportPage.errorReplyFailed'), type: "error" });
            }
        } catch {
            setToast({ message: t('platform.supportPage.errorContact'), type: "error" });
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('platform.supportPage.title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredTickets.length} tickets · {filteredTickets.filter((t) => t.status === "open").length} open
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('platform.supportPage.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                    <option value="all">{t('platform.supportPage.allStatus')}</option>
                    <option value="open">{t('platform.supportPage.statusOpen')}</option>
                    <option value="in_progress">{t('platform.supportPage.statusInProgress')}</option>
                    <option value="resolved">{t('platform.supportPage.statusResolved')}</option>
                    <option value="closed">{t('platform.supportPage.statusClosed')}</option>
                </select>
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`cursor-pointer rounded-xl border bg-white p-4 transition hover:shadow-md dark:bg-gray-900 ${selectedTicket?.id === ticket.id
                            ? "border-purple-300 ring-2 ring-purple-100 dark:border-purple-700 dark:ring-purple-900/30"
                            : "border-gray-200 dark:border-gray-700"
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {ticket.subject}
                                    </h3>
                                    <StatusBadge status={ticket.status} />
                                    <PriorityBadge priority={ticket.priority} />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {ticket.tenant} · {ticket.category}
                                </p>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {ticket.message}
                                </p>
                            </div>
                            <div className="ml-4 text-right">
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {ticket.updatedAt}
                                </p>
                                {ticket.replies.length > 0 && (
                                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        <MessageSquare className="h-3 w-3" />
                                        {ticket.replies.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredTickets.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-900">
                    <HeadphonesIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t('platform.supportPage.noTickets')}
                    </p>
                </div>
            )}

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedTicket.subject}
                                    </h2>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <StatusBadge status={selectedTicket.status} />
                                    <PriorityBadge priority={selectedTicket.priority} />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {selectedTicket.category}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="max-h-[50vh] overflow-y-auto p-6 space-y-4">
                            {/* Original Message */}
                            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {selectedTicket.tenant}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {selectedTicket.createdAt}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedTicket.message}
                                </p>
                            </div>

                            {/* Replies */}
                            {selectedTicket.replies.map((reply) => (
                                <div
                                    key={reply.id}
                                    className={`rounded-lg p-4 ${reply.role === "admin"
                                        ? "bg-purple-50 dark:bg-purple-900/20"
                                        : "bg-gray-50 dark:bg-gray-800"
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {reply.author}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {reply.createdAt}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {reply.message}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Reply Input */}
                        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="flex gap-3">
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder={t('platform.supportPage.replyPlaceholder')}
                                    rows={2}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                                />
                                <button
                                    onClick={handleSendReply}
                                    disabled={sending || !replyMessage.trim()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {sending ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    {t('platform.supportPage.send')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50">
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
                        }`}>
                        {toast.message}
                        <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">×</button>
                    </div>
                </div>
            )}
        </div>
    );
}
