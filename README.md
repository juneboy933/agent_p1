# Agent P1

Agent P1 is a small TypeScript banking assistant that demonstrates tool-calling agents with OpenAI-compatible and Anthropic clients. It uses an in-memory database containing sample accounts and transactions, so it is intended for local development and experimentation rather than production banking.

## Features

- Check an account balance.
- List recent transactions.
- Look up a transaction by ID.
- Validate tool arguments with Zod.
- Run the same tool workflow through OpenAI or Anthropic message APIs.

## Requirements

- Node.js and npm
- An Anthropic API key for the Anthropic CLI, or Ollama for the local OpenAI-compatible CLI

## Setup

```bash
npm install
```

For Anthropic, create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

For the Ollama option, install Ollama, start its service, and make the model available:

```bash
ollama pull qwen2.5:3b
```

Set `OLLAMA_MODEL` if you want to use a different local model.

## Run the Assistant

Start the Ollama/OpenAI-compatible CLI with:

```bash
npm run start:ollama
```

Start the Anthropic CLI with:

```bash
npx tsx src/cli/cli.anthropic.ts
```

Type a question at the `you>` prompt, such as `What is the balance for acc-1?`. Enter `exit` to quit. Conversation logs are written to local `agent*.log.json1` files.

## Test

Run the tests once with:

```bash
npx vitest run
```

Run Vitest in watch mode with `npm test`. Tests use fake model clients and do not make live API requests.

## Project Layout

- `src/tools.ts` — sample database and validated tools
- `src/agents/` — OpenAI and Anthropic agent loops
- `src/cli/` — interactive command-line clients
- `src/tests/` — Vitest coverage for tools and agents
