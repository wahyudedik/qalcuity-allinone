import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIProvider, type AIChatMessage } from '@/lib/ai/provider';

export async function POST(req: Request) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array required' },
                { status: 400 }
            );
        }

        // Validate message structure
        const isValid = messages.every(
            (m: AIChatMessage) =>
                typeof m.role === 'string' &&
                ['user', 'assistant', 'system'].includes(m.role) &&
                typeof m.content === 'string'
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid message structure. Each message must have role (user|assistant|system) and content (string)' },
                { status: 400 }
            );
        }

        // Get AI provider and generate response
        const provider = getAIProvider();
        const response = await provider.chat(messages);

        return NextResponse.json({ response });
    } catch (error) {
        console.error('AI Chat error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { error: 'AI service unavailable' },
            { status: 500 }
        );
    }
}
