# AI Provider Support

This application supports multiple AI providers for resume generation tasks. You can choose between OpenAI and Google Gemini models.

## Configuration

Set the `AI_PROVIDER` environment variable to select your preferred provider:

```bash
# Use OpenAI (default)
AI_PROVIDER="OPENAI"

# Use Google Gemini
AI_PROVIDER="GEMINI"
```

### OpenAI Configuration

```bash
OPENAI_API_KEY="sk-..."
OPENAI_PARSE_MODEL="gpt-4o-mini"          # Model for parsing job descriptions
OPENAI_REWRITE_MODEL="gpt-4o-mini"        # Model for rewriting resume bullets
OPENAI_SELECTION_MODEL="gpt-4o-mini"      # Model for selecting relevant content
```

### Google Gemini Configuration

```bash
GEMINI_API_KEY="..."
GEMINI_PARSE_MODEL="gemini-2.0-flash-exp"     # Model for parsing job descriptions
GEMINI_REWRITE_MODEL="gemini-2.0-flash-exp"   # Model for rewriting resume bullets
GEMINI_SELECTION_MODEL="gemini-2.0-flash-exp" # Model for selecting relevant content
```

## Architecture

The AI provider system uses a factory pattern with the following components:

### Core Components

- **`IAIProvider`** - Interface defining the contract for all AI providers
- **`AIService`** - Factory service that instantiates the appropriate provider based on configuration
- **`OpenAIProvider`** - Implementation using OpenAI GPT models
- **`GeminiProvider`** - Implementation using Google Gemini models

### File Structure

```
apps/worker/src/ai/
├── ai-provider.interface.ts  # IAIProvider interface and shared types
├── ai.service.ts              # AIService factory
├── ai.module.ts               # NestJS module definition
├── openai.provider.ts         # OpenAI implementation
└── gemini.provider.ts         # Google Gemini implementation
```

### AI Operations

All providers support three core operations:

1. **Parse Job Description** - Extract requirements, skills, and keywords from job postings
2. **Select Relevant Content** - Choose the most relevant experiences, projects, and education
3. **Rewrite Bullets** - Optimize resume bullets to align with job requirements

## Adding New Providers

To add a new AI provider:

1. Add the provider to the `AIProvider` enum in `packages/shared/src/enums.ts`
2. Create a new provider class implementing `IAIProvider` in `apps/worker/src/ai/`
3. Add the provider to the factory switch statement in `ai.service.ts`
4. Add configuration environment variables

## Error Handling

Provider-specific errors will fail the job. There is no automatic fallback to alternative providers to ensure consistent behavior and debugging.
