import OpenAI from "openai";
import { createDB, createTools } from "../tools";
import { appendFileSync } from "node:fs";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { runAgentOpenAI } from "../agents/agent.openai";

const client = new OpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama"});
const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
const tools = createTools(createDB());

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
     {
        role: "system",
        content: 
        "You are a banking assistant. Answer only from tool results; never guess balances or transactions." +
        "If a required argumentsuch as the account ID is missing, ask the user for it." + 
        "The owner of this project is called Brian Oduor."
    },
];

const logs = (entry: unknown) => appendFileSync("agent.ollama.log.json1", JSON.stringify({
    t: new Date().toISOString(),
    ...(entry as object)
}) + "\n");

const rl = readline.createInterface({
    input: stdin,
    output: stdout
});

console.log(`Using ${model} via ollama. Type a question, or "exit". \n`);

while(true) {
    const q = (await rl.question("you> ")).trim();
    if(!q) continue;
    if (q === "exit") break;

    const checkpoint = messages.length;
    messages.push({ role: "user", content: q });
    try {
        const { text } = await runAgentOpenAI({ client, model, tools, messages, logs });
        console.log(`\nagent> ${text}\n`);
    } catch (e) {
        messages.length = checkpoint;
        console.error(`\nerror: ${e instanceof Error ? e.message : e}\n`);
    }
}

rl.close();