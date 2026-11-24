import { describe, it, expect } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { runAnthropicAgent } from "../agents/agent.anthropic";
import { createDB, createTools } from "../tools";

// Fake AI response message
const text = (t: string) => ({ 
    stop_reason: "end_turn", 
    content: [{
        type: "text",
        text: t
    }],
});

// Fake AI response when it uses tools
const toolUse = (id: string, name: string, input: unknown) => ({
    stop_reason: "tool_use",
    content: [{
        type: "tool_use",
        id,
        name,
        input
    }],
});

// Replays scripted responses
// Repeats the last one if the loop keeps asking
function fakeClient(responses: unknown[]) {
    const calls: Anthropic.MessageParam[][] = [];
    let i = 0;
    const client = {
        messages : {
            create: async (params: { messages: Anthropic.MessageParam[] }) => {
                calls.push(structuredClone(params.messages));
                return responses[Math.min(i++, responses.length - 1)];
            }
        }
    }
    return { client: client as any, calls };
}

const base = () => ({ model: "test-model", tools: createTools(createDB())});
const userMsg = (content: string): Anthropic.MessageParam => ({
    role: "user", content
});


describe('Run Agent', () => {
    it('Returns text immediately when the model needs no tools', async() => {
        const { client, calls } = fakeClient([text("Hello!")]);
        const r = await runAnthropicAgent({...base(), client, messages: [userMsg("hi")]});
        expect(r.text).toBe("Hello!");
        expect(calls).toHaveLength(1);
    });

    it('Runs a requested tool and sends back a matching tool_result', async() => {
        const { client, calls } = fakeClient([
            toolUse("tu_1", "getBalance", { accountId: "acc-1"}),
            text("Your balance is 15000 KES."),
        ]);
        const r = await runAnthropicAgent({ ...base(), client, messages: [userMsg("balance?")]});
        expect(r.text).toContain("15000");
        expect(calls).toHaveLength(2);
        const last = calls[1].at(-1)!;
        expect(last.role).toBe("user");
        expect(last.content).toMatchObject([
            { type: "tool_result", tool_use_id: "tu_1", content: expect.stringContaining("15000")},
        ]);
    })

    it('Returns invalid arguments to the model as is_error and keeps going', async () => {
        const { client, calls } = fakeClient([
            toolUse("tu_1", "getBalance", {}),
            text("Which account?"),
        ]);

        const r = await runAnthropicAgent({ ...base(), client, messages: [userMsg("balance?")]});
        expect(r.text).toBe("Which account?");
        expect(calls[1].at(-1)!.content).toMatchObject([
            { type: "tool_result", tool_use_id: "tu_1", is_error: true },
        ]);
    })

    it('Stops at maxIterations when the model never finishes', async () => {
        const { client } = fakeClient([toolUse("tu_1", "getBalance", {accounrId: "acc-1"})]);
        await expect(
            runAnthropicAgent({...base(), client, messages: [userMsg("loop")],
                maxIteration: 3
            }),
        ).rejects.toThrow(/max iteration/i);
    })

    it('Keeps earlier turns in history across questions', async () => {
        const { client, calls } = fakeClient([text("A1"), text("A2")]);
        const messages = [userMsg("Q1")];
        await runAnthropicAgent({...base(), client, messages });
        messages.push(userMsg("Q2"));
        await runAnthropicAgent({...base(), client, messages });

        const secondCall = JSON.stringify(calls[1]);
        expect(secondCall).toContain("Q1")
        expect(secondCall).toContain("A1")
        expect(secondCall).toContain("Q2")
    });
});