# AI Provider Configuration

This document explains how to configure AI providers for the Tailor.me worker service.

## Supported Providers

The system supports two AI providers:
- **OpenAI** (GPT models)
- **Google Gemini**

## Environment Variables

### Provider Selection

```bash
# Choose which AI provider to use (OPENAI or GEMINI)
# Default: OPENAI
AI_PROVIDER=OPENAI
```

### OpenAI Configuration

```bash
# OpenAI API Key (required if using OpenAI)
OPENAI_API_KEY=sk-proj-...

# Model selection for different operations (optional)
OPENAI_PARSE_MODEL=gpt-4o-mini        # Job description parsing
OPENAI_REWRITE_MODEL=gpt-4o-mini      # Bullet rewriting
OPENAI_SELECTION_MODEL=gpt-4o-mini    # Content selection
```

**Recommended Models:**
- `gpt-4o-mini` - Fast and cost-effective (default)
- `gpt-4o` - Higher quality, more expensive
- `gpt-4-turbo` - Previous generation

### Google Gemini Configuration

```bash
# Google Gemini API Key (required if using Gemini)
GEMINI_API_KEY=AIzaSy...

# Model selection for different operations (optional)
GEMINI_PARSE_MODEL=gemini-3-flash-preview      # Job description parsing
GEMINI_REWRITE_MODEL=gemini-3-flash-preview    # Bullet rewriting
GEMINI_SELECTION_MODEL=gemini-3-flash-preview  # Content selection
```

**Recommended Models:**
- `gemini-3-flash-preview` - Fast and efficient (default)
- `gemini-2.0-flash-exp` - Experimental flash model
- `gemini-1.5-pro` - Higher quality, slower

**⚠️ Important Notes for Gemini:**
- Free tier has strict rate limits (5 requests/minute for flash models)
- Parallel bullet rewriting may exceed rate limits quickly
- Consider upgrading to paid tier or using OpenAI for production
- Rate limit errors will fail the job (as designed)

### Feature Flags

```bash
# Skip AI content selection step (use all content)
SKIP_CONTENT_SELECTION=false

# Skip AI bullet rewriting step (use original bullets)
SKIP_REWRITE_BULLETS=false
```

## Error Handling

Both providers include comprehensive error handling:

### Rate Limiting
- **OpenAI**: Returns clear error message with quota information
- **Gemini**: Returns error message suggesting to upgrade plan or switch providers
- **Behavior**: Job fails immediately (no retries)

### Authentication Errors
- Missing or invalid API keys result in immediate job failure
- Clear error messages indicate which API key needs to be checked

### API Errors
- Network errors, timeouts, and other API failures fail the job
- Error details are logged for debugging

## Example Configurations

### Development (OpenAI)
```bash
AI_PROVIDER=OPENAI
OPENAI_API_KEY=sk-proj-...
OPENAI_PARSE_MODEL=gpt-4o-mini
OPENAI_REWRITE_MODEL=gpt-4o-mini
OPENAI_SELECTION_MODEL=gpt-4o-mini
```

### Development (Gemini - Free Tier)
```bash
AI_PROVIDER=GEMINI
GEMINI_API_KEY=AIzaSy...
GEMINI_PARSE_MODEL=gemini-3-flash-preview
GEMINI_REWRITE_MODEL=gemini-3-flash-preview
GEMINI_SELECTION_MODEL=gemini-3-flash-preview
# Consider enabling these to reduce API calls:
SKIP_CONTENT_SELECTION=true
SKIP_REWRITE_BULLETS=true
```

### Production (OpenAI)
```bash
AI_PROVIDER=OPENAI
OPENAI_API_KEY=sk-proj-...
OPENAI_PARSE_MODEL=gpt-4o
OPENAI_REWRITE_MODEL=gpt-4o-mini
OPENAI_SELECTION_MODEL=gpt-4o-mini
```

## Cost Considerations

### OpenAI Pricing (as of 2026)
- `gpt-4o-mini`: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- `gpt-4o`: ~$5 per 1M input tokens, ~$15 per 1M output tokens

### Gemini Pricing
- Free tier: Very limited (5 req/min for flash models)
- Paid tier: Significantly cheaper than OpenAI for comparable quality

### Optimization Tips
1. Use `gpt-4o-mini` or `gemini-flash` for most operations
2. Use higher-quality models only for critical operations (parsing)
3. Enable `SKIP_CONTENT_SELECTION` if budget is tight
4. Monitor API usage through provider dashboards

## Switching Providers

To switch from one provider to another:

1. Update `AI_PROVIDER` environment variable
2. Ensure the corresponding API key is set
3. Optionally adjust model names
4. Restart the worker service

No code changes are required - the system automatically uses the configured provider.
