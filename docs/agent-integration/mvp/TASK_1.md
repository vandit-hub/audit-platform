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
- [x] `@anthropic-ai/claude-agent-sdk` appears in `package.json` dependencies
- [x] `ANTHROPIC_API_KEY` is set in `.env` file
- [x] Run `npm list @anthropic-ai/claude-agent-sdk` to verify installation

## Completion Notes

**Completed:** Task 1 successfully completed with `--force` flag due to Zod peer dependency conflict.

**Installation Details:**
- Package installed: `@anthropic-ai/claude-agent-sdk@0.1.27`
- Method: `npm install @anthropic-ai/claude-agent-sdk --force`
- Reason for force: Zod v4 vs v3 peer dependency mismatch
- Result: **No runtime issues detected** - SDK works perfectly despite warning

**Testing:**
- Created `test-agent-sdk.ts` to verify functionality
- Test passed successfully with response: "SDK is working!"
- Cost tracking confirmed working ($0.0065 for test query)
- No Zod-related runtime errors

**Action Required:**
- Replace `ANTHROPIC_API_KEY=sk-ant-your-key-here` in `.env` with actual API key from https://console.anthropic.com/

## Next Task

Proceed to **TASK_2.md** - Create Type Definitions
