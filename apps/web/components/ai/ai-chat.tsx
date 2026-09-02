'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, Minimize2, Maximize2, BarChart3, FileText, DollarSign } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function AIChat() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: t('ai.welcomeMessage') || 'Halo! Saya adalah AI Assistant Qalcuity. Saya bisa membantu Anda dengan:\n\n• Menampilkan data penjualan\n• Membuat invoice\n• Menganalisis profit & loss\n• Memberikan insight bisnis\n\nAda yang bisa saya bantu?',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const [error, setError] = useState<string | null>(null);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);
        setError(null);

        try {
            // Build messages history for API (only role + content)
            const apiMessages = [...messages, userMessage].map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || (t('ai.errorContacting') || 'Gagal menghubungi AI service'));
            }

            const data = await res.json();

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : (t('common.error') || 'Terjadi kesalahan');
            setError(errorMessage);
            const fallbackResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: t('ai.errorProcessing') || 'Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, fallbackResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700"
                aria-label="Buka AI Assistant"
            >
                <Bot className="h-6 w-6" />
            </button>
        );
    }

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl transition-all dark:border-gray-700 dark:bg-gray-800 ${isMinimized ? 'h-16 w-16' : 'h-[500px] w-96'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    {!isMinimized && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Qalcuity AI</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        aria-label="Tutup"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                        <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                                        <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-2">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                                        <span
                                            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                            style={{ animationDelay: '0.1s' }}
                                        />
                                        <span
                                            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                            style={{ animationDelay: '0.2s' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mx-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 px-4 pb-2">
                        <button
                            onClick={() => setInput('Tampilkan penjualan bulan ini')}
                            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                            <BarChart3 className="mr-1 inline h-3 w-3" /> Penjualan
                        </button>
                        <button
                            onClick={() => setInput('Status invoice')}
                            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                            <FileText className="mr-1 inline h-3 w-3" /> Invoice
                        </button>
                        <button
                            onClick={() => setInput('Analisis profit')}
                            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                            <DollarSign className="mr-1 inline h-3 w-3" /> Profit
                        </button>
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Tanyakan sesuatu..."
                                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
