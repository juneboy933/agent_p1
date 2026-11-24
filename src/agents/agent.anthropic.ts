import type Anthropic from "@anthropic-ai/sdk";
import { executeTool, type Tool } from "../tools";

export type MessageClient = {
    messages: {
        create(
            params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
    };
};

export type RunAgentOptions = {
    client: MessageClient;
    model: string;
    tools: Tool[];
    messages: Anthropic.MessageParam[];
    system?: string;
    maxIteration?: number;
    log?: (entry: unknown) => void;
};

export async function runAnthropicAgent(opts: RunAgentOptions) {
    const {client, model, tools, messages, system, maxIteration = 8, log } = opts;
    const toolsDefs = tools.map(({name,description,input_schema}) => ({
        name,
        description,
        input_schema
    }))

    for (let i = 1; i <= maxIteration; i++) {
        const res = client.messages.create({
            model,
            max_tokens: 1024,
            system,
            tools: toolsDefs,
            messages,
        });

        log?.({ 
            iteration: i, 
            stop_reason: (await res).stop_reason, 
            content: (await res).content
        });

        messages.push({ role: 'assistant', content: (await res).content});

        if((await res).stop_reason !== 'tool_use'){
            const text = (await res).content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join("/n");
            return { text, iteration: i };
        }

        const results = (await res).content
        .filter((b) => b.type === 'tool_use')
        .map((b) => {
            const r = executeTool(tools, b.name, b.input);
            log?.({ tool: b.name, input: b.input, result: r});
            return {
                type: 'tool_result' as const,
                tool_use_id: b.id,
                content: JSON.stringify(r.ok ? r.data : r.error),
                is_error: !r.ok,
            };
        });
        messages.push({ role: 'user', content: results });
    }

    throw new Error(`Max iteration (${maxIteration} reached)`);
}