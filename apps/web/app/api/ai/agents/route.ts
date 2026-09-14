export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MSG } from '@/lib/api-messages';
import { requireAuth } from '@/lib/session';
import { handleApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { parseQuery } from '@/lib/ai/nlu-parser';
import {
    determineAgent,
    determineAction,
    executeAgent,
    getAgentSuggestions,
    type AgentName,
    type AgentAction,
} from '@/lib/ai/agents/agent-orchestrator';

// ─── Zod Schemas ───────────────────────────────────────────────────────────

const agentQuerySchema = z.object({
    query: z.string().min(1, 'Query tidak boleh kosong').max(500, 'Query maksimal 500 karakter'),
    agent: z.enum(['finance', 'sales', 'inventory']).optional(),
    action: z.string().max(50).optional(),
    params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

// ─── POST /api/ai/agents ──────────────────────────────────────────────────

/**
 * Process a natural language query through the appropriate AI agent.
 *
 * Body: { query: string, agent?: string, action?: string, params?: Record }
 * Response: { success: true, agent, action, result, summary, timestamp }
 */
export async function POST(req: Request) {
    try {
        // 1. Auth check
        const auth = await requireAuth();
        const tenantId = auth.tenantId;

        // 2. Validate input
        const body = await req.json();
        const validated = agentQuerySchema.parse(body);

        // 3. Parse query with NLU
        const nluResult = parseQuery(validated.query);

        // 4. Determine agent (explicit override or auto-detect)
        let agent: AgentName | null = validated.agent as AgentName || null;
        let action: AgentAction;

        if (agent) {
            // Use explicit agent + determine action from query
            action = determineAction(agent, nluResult);
        } else {
            // Auto-detect agent from NLU result
            agent = determineAgent(nluResult);
            if (!agent) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Tidak dapat mengenali agent untuk query ini. Coba gunakan query yang lebih spesifik (misalnya: "prediksi cash flow", "skor lead", "prediksi stok").',
                    },
                    { status: 400 }
                );
            }
            action = determineAction(agent, nluResult);
        }

        // 5. Override action if explicitly provided
        if (validated.action) {
            action = validated.action as AgentAction;
        }

        // 6. Execute agent
        const response = await executeAgent(agent, tenantId, action, validated.params as Record<string, string | number | undefined>);

        return NextResponse.json({
            success: true,
            ...response,
        });
    } catch (error) {
        logger.error('[API] /api/ai/agents POST error:', error);
        return handleApiError(error);
    }
}

// ─── GET /api/ai/agents ──────────────────────────────────────────────────

/**
 * Get agent status and proactive suggestions.
 *
 * Response: { success: true, agents: [...], suggestions: [...] }
 */
export async function GET() {
    try {
        // 1. Auth check
        const auth = await requireAuth();
        const tenantId = auth.tenantId;

        // 2. Get suggestions from all agents
        const suggestions = await getAgentSuggestions(tenantId);

        // 3. Agent status (static metadata)
        const agents = [
            {
                name: 'finance',
                label: 'Finance Agent',
                icon: 'TrendingUp',
                status: 'active',
                description: 'Cash flow prediction, expense categorization, payment reminders',
                actions: [
                    { id: 'predict_cash_flow', label: 'Prediksi Cash Flow' },
                    { id: 'categorize_expense', label: 'Kategorikan Pengeluaran' },
                    { id: 'payment_reminders', label: 'Reminder Pembayaran' },
                    { id: 'financial_insights', label: 'Insight Keuangan' },
                ],
            },
            {
                name: 'sales',
                label: 'Sales Agent',
                icon: 'Users',
                status: 'active',
                description: 'Win probability, lead scoring, sales forecasting',
                actions: [
                    { id: 'win_probability', label: 'Win Probability' },
                    { id: 'lead_score', label: 'Skor Lead' },
                    { id: 'sales_forecast', label: 'Forecast Penjualan' },
                    { id: 'pipeline_insights', label: 'Pipeline Overview' },
                    { id: 'next_best_action', label: 'Next Best Action' },
                ],
            },
            {
                name: 'inventory',
                label: 'Inventory Agent',
                icon: 'Package',
                status: 'active',
                description: 'Stockout prediction, demand forecasting, dead stock detection',
                actions: [
                    { id: 'stockout_prediction', label: 'Prediksi Stockout' },
                    { id: 'reorder_suggestion', label: 'Saran Reorder' },
                    { id: 'dead_stock', label: 'Deteksi Dead Stock' },
                    { id: 'inventory_insights', label: 'Insight Inventory' },
                    { id: 'demand_forecast', label: 'Forecast Demand' },
                ],
            },
        ];

        return NextResponse.json({
            success: true,
            agents,
            suggestions,
        });
    } catch (error) {
        logger.error('[API] /api/ai/agents GET error:', error);
        return handleApiError(error);
    }
}
