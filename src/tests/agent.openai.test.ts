import {describe, it, expect} from 'vitest';
import { runAgentOpenAI } from '../agents/agent.openai';
import { createTools, createDB } from '../tools';

const text = (t: string) => ({
    choices: [{ 
        finish_reason: "stop", 
        message: {role: "assistant", content: t}}]
});

const toolCall = (id: string, name: string, args: unknown) => ({
    choices: [{
        finish_reason: "tool_calls",
        message: {
            role: "assistant",
            content: null,
            tool_calls: [
                {
                    id,
                    type: "function",
                    function: { 
                        name, 
                        arguments: typeof args === "string" 
                            ? args 
                            : JSON.stringify(args)
                    }
                }
            ]
        }
    }]
});

function fakeClient(responses: unknown[]) {
    const calls: any[][] = [];
    let i = 0;
    const client = {
        chat: {
            completions: {
                create: async (params: { messages: any[]}) => {
                    calls.push(structuredClone(params.messages));
                    return responses[Math.min(i++, responses.length - 1)];
                }
            }
        }
    };
    return {client: client as any, calls};
}

const base = () => ({ 
    model: "fake-model",
    tools: createTools(createDB())
});

const userMsg = (content: string) => ({
    role: "user" as const,
    content
});

describe("runAgentOpenAI", () => {
    it('returns text immediately when no tools are needed', async () => {
        const { client, calls } = fakeClient([text("hello")]);
        const result = await runAgentOpenAI({...base(), client, messages: [userMsg("hi")]});
        expect(result.text).toBe("hello");
        expect(calls).toHaveLength(1);
    });

    it("runs a tool and sends back a role: 'tool' message with the matching id", async() => {
        const { client, calls } = fakeClient([
            toolCall('tc_1', 'getBalance', { accountId: 'acc-1'}),
            text('Your balance is 15000 KES.'),
        ]);
        const result = await runAgentOpenAI({...base(), client, messages: [userMsg("balance?")]});
        expect(result.text).toContain("15000");
        expect(calls[1].at(-1)).toMatchObject({
            role: "tool",
            tool_call_id: "tc_1",
            content: expect.stringContaining("15000"),
        });
    });

    it("sends validation errors back to the model and keeps going", async () => {
        const { client, calls } = fakeClient([
            toolCall("tc_1", "getBalance", {}),
            text('Which account?'),
        ]);
        const result = await runAgentOpenAI({...base(), client, messages: [userMsg("balance")]});
        expect(result.text).toBe('Which account?');
        expect(calls[1].at(-1)).toMatchObject({
            role: "tool",
            tool_call_id: "tc_1",
            content: expect.stringMatching(/^Error/)
        });
    });

    it('survives malformed JSON in arguments', async () => {
        const { client, calls } = fakeClient([
            toolCall("tc_1", "getBalance", "{accountId: acc-1"), // broken JSON string
            text("sorry, retrying"),
        ]);
        const result = await runAgentOpenAI({...base(), client, messages: [userMsg("balance")]});
        expect(result.text).toBe("sorry, retrying");
        expect(calls[1].at(-1)).toMatchObject({
            role: "tool",
            tool_call_id: "tc_1",
            content: expect.stringMatching(/^Error.*json/i),
        });
    });

    it('stops at maxIterations', async () => {
        const { client } = fakeClient([
            toolCall("tc_1", "getBalance", { accountId: "acc-1"}),
        ]);
        await expect(
            runAgentOpenAI({...base(), client, messages: [userMsg("loop")], maxIterations: 3}),
        ).rejects.toThrow(/max iterations/i);
    });

    it('keeps earlier turns in history', async () => {
        const { client, calls } = fakeClient([text("A1"), text("A2")]);
        const messages = [userMsg("Q1")];
        await runAgentOpenAI({...base(), client, messages});
        messages.push(userMsg("Q2"));
        await runAgentOpenAI({...base(), client, messages});

        const second = JSON.stringify(calls[1]);
        expect(second).toContain("Q1");
        expect(second).toContain("A1");
        expect(second).toContain("Q2");
    });
});