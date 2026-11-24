import { z } from 'zod';
import { DB, ToolResult } from './types';

export type Tool < T = any> = {
    name: string;
    description: string;
    input_schema: { 
        type: 'object'; 
        properties: Record < string, unknown >;
        required?: string[];
    };
    schema: z.ZodType<T>;
    handler: (args: T) => ToolResult;
}

export function createDB(): DB {
    return {
        accounts: [
            {id: "acc-1", owner: "Brian", balance:15000, currency: "KES"},
            {id: "acc-2", owner: "Antony", balance: 8200, currency: "KES"},
        ],
        transactions: [
            {id: "t1", accountId: "acc-1", amount: 500, type: "debit", description: "Airtime", date: "2026-11-15"},
            {id: "t2", accountId: "acc-1", amount: 12000, type: "credit", description: "Salary", date: "2026-11-17"},
            {id: "t3", accountId: "acc-1", amount: 2500, type: "debit", description: "KPLC tokens", date: "2026-11-18"},
            {id: "t4", accountId: "acc-1", amount: 1200, type: "debit", description: "Naivas", date: "2026-11-19"},
            {id: "t5", accountId: "acc-2", amount: 300, type: "debit", description: "Matatu", date: "2026-11-19"}
        ],
    }
}

function defineTool<T>(tool: Tool<T>): Tool {
    return tool as Tool;
}

export function createTools(db: DB): Tool[] {
    return [
        defineTool({
            name: "getBalance",
            description: "Get the current balance of one account. Requires an account ID such as 'acc-1.",
            input_schema: {
                type: "object",
                properties: { 
                    accountId: {
                        type: "String", 
                        description: "The accout ID, e.g. acc-1"
                    } 
                },
                required: ['accountId'],
            },
            schema: z.object({ accountId: z.string().min(1) }),
            handler: ({ accountId}) => {
                if(!accountId) return {ok: false, error: 'Invalid input or missing account ID'}
                const acc = db.accounts.find((a) => a.id === accountId);
                if (!acc) return { ok: false, error: `Account ${accountId} not found`}
                return { 
                    ok: true, 
                    data: {
                        accountId: acc.id,
                        balance: acc.balance,
                        currency: acc.currency,
                    }};
            },
        }),

        defineTool({
            name: "listTransactions",
            description: "List recent transactions for an account, newest first. Default limit is 5, max 50.",
            input_schema: {
                type: "object",
                properties: {
                    accountId: { type: 'string', description: 'The account ID, e.g. acc-1'},
                    limit: { type: 'integer', description: 'How many to return' },
                },
                required: ['accountId', 'limit'],
            },
            schema: z.object({
                accountId: z.string().min(1),
                limit: z.number().int().min(1).max(50),
            }),
            handler: ({accountId, limit}) => {
                const acc = db.accounts.find((a) => a.id === accountId);
                if(!acc) {
                    return {
                        ok: false,
                        error: `Account ${accountId} not found `
                    }
                }

                const txs = db.transactions
                .filter((tx) => tx.accountId === accountId)
                .sort((a,b) => b.date.localeCompare(a.date))
                .slice(0, limit);
                
                return { ok: true, data: txs};
            }
        }),

        defineTool({
            name: 'getTransactionById',
            description: 'Get the transaction from a provided transactionId, e.g. t4',
            input_schema: {
                type: 'object',
                properties: { 
                    transactionId: { type: 'string', description: 'The transaction ID, e.g. T4'}
                },
                required: ['transactionId'],
            },
            schema: z.object({
                transactionId: z.string()
            }),
            handler: ({ transactionId }) => {
                const tx = db.transactions.find((t) => t.id === transactionId);
                if(!tx) return {
                    ok: false,
                    error: `Transaction ${transactionId} not found`
                }

                return {
                    ok: true,
                    data: tx
                }
            }
        })
    ];
}

export function executeTool(tools: Tool[], name: string, input: unknown): ToolResult {
    const tool = tools.find((t) => t.name === name);
    if(!tool){
        return { ok: false, error: `Unknown tool: ${name}`};
    }

    const parsed = tool.schema.safeParse(input);
    if(!parsed.success) {
        const msg = parsed.error.issues.map(
            (i) => `${i.path.map(String).join(".")}: ${i.message}`).join(";");
        return {
            ok: false,
            error: `Invalid input: ${msg}`
        };
    }

    try {
        return tool.handler(parsed.data);
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : "Tools failed"
        };
    }
}