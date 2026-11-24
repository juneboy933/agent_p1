import OpenAI from "openai";
import { executeTool, type Tool } from "../tools";

type msg = OpenAI.Chat.ChatCompletionMessageParam;

export type ChatClient = {
    chat: {
        completions: {
            create(params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming): Promise<OpenAI.Chat.ChatCompletion>
        }
    }
}

export type RunAgentOpenAiOptions = {
    client: ChatClient;
    model: string;
    tools: Tool[];
    messages: msg[];
    maxIterations?: number;
    logs?: (entry: unknown) => void;
}

export async function runAgentOpenAI(opts: RunAgentOpenAiOptions): Promise<{ text: string, iterations: number}> {
    const { client, model, tools, messages, maxIterations = 8, logs } = opts
    const toolDef = tools.map((t) => ({
        type: "function" as const,
        function: {name: t.name, description: t.description, parameters: t.input_schema },
    }));

    for( let i = 1; i <= maxIterations; i++) {
        const res = await client.chat.completions.create({
            model,
            tools: toolDef,
            messages,
        });
        const msg = res.choices[0].message;
        logs?.({ iterations: i, message: msg});

        // Push the assistant message before any results
        messages.push({ 
            role: "assistant", 
            content: msg.content, 
            tool_calls: msg.tool_calls
        });

        const calls = msg.tool_calls ?? [];
        if(calls.length === 0) {
            return { text: msg.content ?? "", iterations: i};
        }

        for(const call of calls) {
            let content: string;

            if(call.type !== "function"){
                content = "Error: unsupported tool call type";
            } else {
                try {
                    const input = JSON.parse(call.function.arguments || "{}");
                    const r = executeTool(tools, call.function.name, input);
                    logs?.({ tool: call.function.name, input, result: r });
                    content = r.ok ? JSON.stringify(r.data) : `Error: ${r.error}`;
                } catch {
                    content = "Error: arguments were not valid JSON";
                }
            }
            messages.push({ role: "tool", tool_call_id: call.id, content });
        }
    }

    throw new Error(`Max iterations ${maxIterations} reached`);
}