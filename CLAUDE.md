# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Twitter/X fact-checking bot that monitors posts about "チームみらい" (Team Mirai), automatically performs fact-checking using OpenAI's GPT models, and sends notifications to Slack when misinformation is detected.

## Key Commands

### Development
- `bun run dev` - Start development server with hot reload
- `bun run fact-check "text to check"` - Run fact-checking on provided text via CLI
- `bun run upload` - Upload policy documents from `policy/` directory to OpenAI vector store

### Code Quality
- `bun run biome:check:write` - Run Biome checks and auto-fix issues
- `bun run format` - Format code with Biome
- `bun run lint` - Lint code with Biome

### Testing
- `bun test` - Run tests using Bun's built-in test runner
- `bun test src/__tests__/specific.test.ts` - Run a single test file

### Build
- `bun run build` - Build main application (includes typecheck)
- `bun run build:scripts` - Build scripts only (for CLI tools)
- `bun run typecheck` - Run TypeScript type checking only

## Architecture Overview

### Core Components

1. **Fact-Checking Engine** (`src/lib/fact_checker/`)
   - Abstracted interface supporting multiple providers (OpenAI, local)
   - Provider selection based on ENV variable:
     - `ENV=prod` or `ENV=dev` → OpenAI provider
     - Any other value → Local provider (for testing)
   - OpenAI: Uses o3-mini model with file search capabilities
   - Local: Returns mock data from JSON file
   - Strict rules: only checks claims about people, not events or achievements
   - Returns OK/NG status with explanations and citations

2. **Twitter Integration** (`src/lib/twitter.ts`, `src/lib/twitter_query/`)
   - Searches for Team Mirai-related posts using Twitter API v2
   - Configurable keywords and filters in `src/lib/twitter_query/config.ts`

3. **Slack Integration** (`src/lib/slack/`)
   - Abstracted interface supporting multiple providers (Slack, local)
   - Provider selection based on ENV variable:
     - `ENV=prod` or `ENV=dev` → SlackProvider (実際のSlack API)
     - Any other value → LocalSlackProvider (標準出力)
   - Slack: Uses Slack Bolt framework with interactive buttons and mentions
   - Local: Outputs to console for development
   - Sends notifications when misinformation is detected
   - Supports interactive buttons for approve/post actions
   - Handles app mentions for fact-checking requests

4. **Web Server** (`src/index.ts`)
   - Built with Hono framework
   - Main endpoints:
     - `GET /cron/fetch` - Scheduled endpoint for Twitter monitoring (protected by API_SECRET_KEY)
     - `POST /slack/events` - Webhook for Slack events
     - `POST /slack/actions` - Webhook for Slack interactive actions

### Environment Variables Required

All stored in `.env` file:

#### Core System
- `ENV` - Environment mode (`prod`, `dev`, or other values for local testing, defaults to `local`)

#### OpenAI Provider (when ENV=prod/dev)
- `OPENAI_API_KEY` - OpenAI API key
- `VECTOR_STORE_ID` - OpenAI vector store ID (obtained after running `bun run upload`)

#### Slack Provider (when ENV=prod/dev)
- `SLACK_BOT_TOKEN` - Slack Bot User OAuth Token
- `SLACK_SIGNING_SECRET` - Slack Signing Secret
- `SLACK_CHANNEL_ID` - Slack channel ID for notifications

#### External APIs
- `X_BEARER_TOKEN` - Twitter/X API Bearer Token
- `API_SECRET_KEY` - Secret for authenticating API requests

## Development Guidelines

### Code Style
- TypeScript with strict mode enabled
- Biome for formatting: 2 spaces, double quotes
- Pre-commit hooks run Biome checks automatically via Lefthook
- Pre-push hooks run full build and script builds to ensure deployability

### Fact-Checking Logic
The fact-checker has specific rules defined in `src/lib/fact-check.ts`:
- Only checks factual claims about people (not events/achievements)
- Requires citations from vector store for NG judgments
- Uses structured prompts for consistent output format

### Testing Approach
- Tests located in `src/__tests__/`
- Use Bun's built-in test runner
- Focus on unit testing query builders and core logic
- パターンを繰り返すようなテストはtest.eachを使ってテストを書くこと
- When using `test.each` with Bun, use array format for proper variable interpolation:
  ```typescript
  test.each([
    ["dev", "openai"],
    ["prod", "openai"],
  ])("ENVが%sの場合、%sが使用されること", (env, want) => {
    // test implementation
  });
  ```

## Local Development Setup

### Option 1: OpenAI API (Production Setup)

1. **Set environment variables**:
   ```bash
   # .env
   ENV=prod  # or dev
   OPENAI_API_KEY=your_openai_api_key
   VECTOR_STORE_ID=your_vector_store_id
   ```

2. **Upload policy documents**:
   ```bash
   bun run upload
   ```

3. **Run the application**:
   ```bash
   bun run dev
   ```

### Option 2: Local Mock Data (Testing Setup)

1. **Set environment variables**:
   ```bash
   # .env
   ENV=local  # or any value other than prod/dev
   ```

2. **Run the application**:
   ```bash
   bun run dev
   ```

Note: Local provider returns mock data from `src/lib/fact_checker/data/fact-check-result.json`
