# Task 1: Install Dependencies

**Duration:** 5 minutes

## Steps

### 1. Install Claude Agent SDK

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 2. Update Environment Variables

Add your Anthropic API key to `.env` file:

```bash
# Add to .env file
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Verification

After completing this task:
- [ ] `@anthropic-ai/claude-agent-sdk` appears in `package.json` dependencies
- [ ] `ANTHROPIC_API_KEY` is set in `.env` file
- [ ] Run `npm list @anthropic-ai/claude-agent-sdk` to verify installation

## Next Task

Proceed to **TASK_2.md** - Create Type Definitions
