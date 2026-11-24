# Repository Guidelines

## Project Structure & Module Organization

- `src/types.ts` defines shared domain and tool-result types.
- `src/tools.ts` contains the in-memory banking database, tool definitions, Zod validation, and tool execution.
- `src/agents/` contains the OpenAI and Anthropic tool-calling loops.
- `src/cli/` contains interactive command-line entry points. `cli.openai.ts` targets a local Ollama-compatible endpoint; `cli.anthropic.ts` uses the Anthropic API.
- `src/tests/` contains Vitest unit and integration-style tests for tools and both agent implementations.
- `tsconfig.json` controls strict TypeScript compilation. Runtime logs such as `agent*.log.json1` are generated artifacts and should not be committed.

## Build, Test, and Development Commands

Install dependencies with `npm install`.

- `npm test` — run Vitest in watch mode.
- `npx vitest run` — run the complete test suite once, suitable for CI.
- `npm start` — launch the default `tsx src/cli` entry point.
- `npm run start:ollama` — launch the OpenAI-compatible CLI against local Ollama; set `OLLAMA_MODEL` to override the default model.

There is no separate build script; `tsx` runs TypeScript directly during development.

## Coding Style & Naming Conventions

Use strict TypeScript with four-space indentation, semicolons, and double quotes where existing code does. Use `camelCase` for variables and functions, `PascalCase` for types, and descriptive tool names such as `getBalance`. Keep provider-specific logic in its corresponding agent or CLI module, and validate external/tool inputs with Zod before handlers run.

## Testing Guidelines

Tests use Vitest and live in `src/tests/*.test.ts`. Name files after the unit or behavior under test, and describe cases with `describe`/`it` blocks focused on observable behavior. Add tests for successful tool calls, validation failures, unknown resources, malformed model input, and iteration limits. Run `npx vitest run` before submitting changes.

## Commit & Pull Request Guidelines

No Git history is available in this checkout to infer established conventions. Use short imperative commit subjects, for example `Fix tool argument validation` or `Add Anthropic agent coverage`. Pull requests should explain the behavior change, list tests run, note any environment variables or provider assumptions, and include CLI output or screenshots when changing user-facing interaction.

## Security & Configuration Tips

Never commit API keys, `.env` files, or generated conversation logs. For Anthropic runs, provide `ANTHROPIC_API_KEY` through the environment or a local `.env`; use fake clients in tests rather than making live API calls.
