import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { createDB, createTools } from '../tools';
import { appendFileSync } from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { runAnthropicAgent } from '../agents/agent.anthropic';

if(!process.env.ANTHROPIC_API_KEY){
    console.error("Missing ANTHROPIC_API_KEY in .env");
    process.exit(1);
}

const client = new Anthropic();
const tools = createTools(createDB());
const messages: Anthropic.MessageParam[] = [];
const log = (entry: unknown) => 
    appendFileSync("agent.log.json1", JSON.stringify({t: new Date().toISOString(), ...entry as object} + "/n"));

const system = 
    "You are a banking assistant. Answer only from tool results; never guess balance or transactions. " +
    "If a required argument such as the account ID is missing, ask the user for it.";

const r1 = readline.createInterface({ input: stdin, output: stdout });
console.log('Type a question, or "exit" to quit. \n');

while(true) {
    const q = await r1.question("you> ")
    if(!q) continue;
    if(q === "exit") break;

    const checkpoint = messages.length;
    messages.push({role: 'user', content: q });
    try {
        const { text } = await runAnthropicAgent({ client, model: "claude-haiku-5-5", system, tools, messages, log });
        console.log(`\nagent> ${text} \n`);
    } catch (e) {
        messages.length = checkpoint;
        console.error(`\nerror: ${e instanceof Error ? e.message: e}\n`);
    }
}
r1.close();