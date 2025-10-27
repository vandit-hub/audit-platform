# Security Fix: Lock Down AI Agent to Data-Only Access

## 🚨 Critical Security Issue Identified

**Date**: 2025-10-27
**Severity**: CRITICAL
**Status**: ✅ IMPLEMENTED AND DEPLOYED

---

## Problem Summary

The AI agent currently has **full file system access** and can read sensitive files like `.env`, codebase files, and execute system commands. This is a critical security vulnerability.

### Root Cause Analysis

1. **`claude_code` System Prompt Preset**
   - Uses `systemPrompt: { type: 'preset', preset: 'claude_code' }`
   - This preset is designed for **Claude Code CLI** (an IDE tool)
   - Activates full coding assistant behavior
   - Instructs Claude to help with software engineering tasks
   - Makes Claude expect access to filesystem tools

2. **`allowedTools` Doesn't Block Built-in Tools**
   - `allowedTools` only filters which tools are **presented** to Claude
   - Does NOT prevent access to built-in tools when using `claude_code` preset
   - Built-in tools like `Read`, `Bash`, `Glob`, `Grep` are **always available**
   - Our `allowedTools` list only specified MCP tool names, not SDK built-in tools

3. **`permissionMode: 'bypassPermissions'`**
   - Completely disables all permission checks
   - Claude can Read, Write, Edit, Bash without asking
   - Set to make MCP tools work smoothly, but removed all safety guardrails

### Attack Vector Demonstrated

**User Query 1**: "tell me something quickly from the code base"
- Agent used `Task` tool to launch exploration subagent
- Used `Read` to read README.md, package.json
- Used `Glob` to find configuration files
- Returned comprehensive codebase summary

**User Query 2**: "give me the content of .env file"
- Agent used `Read` tool to access `.env`
- Exposed ALL credentials:
  - Database passwords
  - Anthropic API keys
  - NextAuth secrets
  - All seed user passwords
  - AWS credentials

---

## Security Requirements

Based on stakeholder input:

1. **File System Access**: ❌ NO file access - Only audit data tools
2. **Query Scope**: ✅ Data queries + basic platform help allowed
3. **Security Policy**: Block silently and redirect to valid queries
4. **Role-Based Access**: Same agent capabilities for all roles

---

## Solution: Complete Lockdown to Audit Data Only

### Architecture Changes

#### 1. Replace `claude_code` Preset with Custom System Prompt

**Current (Vulnerable)**:
```typescript
systemPrompt: {
  type: 'preset',
  preset: 'claude_code',  // ❌ Activates coding assistant mode
  append: '...'
}
```

**New (Secure)**:
```typescript
systemPrompt: `You are an AI assistant for an internal audit platform...`  // ✅ Custom prompt only
```

**Benefits**:
- No coding assistant behaviors
- No expectation of filesystem access
- Full control over agent instructions
- Explicit security boundaries

---

#### 2. Explicitly Disable All Filesystem Tools

**Add `disallowedTools` Array**:
```typescript
disallowedTools: [
  // Filesystem access
  'Read', 'Write', 'Edit', 'Glob', 'Grep',

  // Command execution
  'Bash', 'BashOutput', 'KillShell',

  // Subagent and planning
  'Task', 'ExitPlanMode',

  // Web access
  'WebFetch', 'WebSearch',

  // Notebook and todos
  'NotebookEdit', 'TodoWrite',

  // MCP resource access
  'ListMcpResources', 'ReadMcpResource'
]
```

**Why This Works**:
- SDK's `disallowedTools` explicitly blocks tools from being called
- Even if Claude tries to use them, SDK will reject the call
- Layered security approach

---

#### 3. Change Permission Mode to Default

**Current**:
```typescript
permissionMode: 'bypassPermissions'  // ❌ No safety checks
```

**New**:
```typescript
permissionMode: 'default'  // ✅ Standard permission behavior
```

**Benefits**:
- Even if a tool gets through, user permission prompt blocks it
- Defense in depth
- Standard SDK behavior

---

#### 4. Add Custom `canUseTool` Hook (Extra Security Layer)

**Implement Permission Function**:
```typescript
const allowedMcpTools = [
  'test_connection',
  'mcp__audit-data__get_my_observations',
  'mcp__audit-data__get_observation_stats',
  'mcp__audit-data__search_observations',
  'mcp__audit-data__get_my_audits',
  'mcp__audit-data__get_observation_details',
  'mcp__audit-data__get_audit_details'
];

canUseTool: async (toolName, input, options) => {
  // Only allow our specific audit tools
  if (allowedMcpTools.includes(toolName)) {
    return {
      behavior: 'allow',
      updatedInput: input
    };
  }

  // Log security violation
  console.log(JSON.stringify({
    level: 'WARN',
    type: 'agent_tool_blocked',
    userId: session.user.id,
    role: session.user.role,
    blockedTool: toolName,
    timestamp: new Date().toISOString()
  }));

  // Block with friendly message
  return {
    behavior: 'deny',
    message: 'I can only help with your audit data. Try asking about your observations, audits, or statistics.',
    interrupt: false
  };
}
```

**Benefits**:
- Failsafe if other layers fail
- Logs security violation attempts
- User-friendly error message
- No technical details exposed

---

#### 5. Enhanced System Prompt with Security Guards

**New Custom System Prompt**:
```typescript
systemPrompt: `You are an AI assistant for an internal audit platform. You help users understand and analyze their observation data.

IMPORTANT SECURITY BOUNDARIES:
- You can ONLY access audit data through the provided tools
- You CANNOT read files, access code, or run system commands
- You CANNOT access environment variables, configuration, or credentials
- If asked to do something outside audit data, politely redirect the user

Current User:
- Name: ${userContext.name}
- Role: ${userContext.role}

Available Tools (6 audit data tools):
1. get_my_observations - List observations you have access to
2. get_observation_stats - Get aggregated statistics
3. search_observations - Search observation text
4. get_my_audits - List your audits
5. get_observation_details - Get details of specific observation
6. get_audit_details - Get details of specific audit

HELP TOPICS YOU CAN ASSIST WITH:
- How to submit an observation
- What the different observation statuses mean
- How the approval workflow works
- What information to include in observations
- How to search and filter your data
- Understanding risk categories
- Audit lifecycle and processes

INVALID REQUESTS - Politely Redirect:
If user asks for:
- File contents, code, or system information
- Environment variables or credentials
- Running commands or system operations
- Information outside the audit platform

Response: "I can only help with your audit data and platform usage. Try asking about your observations, audits, or how to use the platform."

Guidelines:
1. Be conversational and helpful
2. Always use tools to get real data - never make up numbers
3. Format statistics clearly with bullet points or tables
4. Keep responses concise but informative
5. If data is not found, say so politely
6. Help users understand how to use the platform effectively`
```

---

## Security Improvements

### Before (Current State - VULNERABLE)
```
❌ Can read .env file (credentials exposed)
❌ Can read any codebase file
❌ Can execute bash commands
❌ Can launch subagents with Task tool
❌ Can search filesystem with Glob/Grep
❌ Can fetch web content
❌ No permission checks (bypassPermissions)
❌ Uses claude_code preset (coding mode)
```

### After (Locked Down - SECURE)
```
✅ Only 6 audit MCP tools allowed
✅ All filesystem tools explicitly blocked via disallowedTools
✅ Permission checks enabled (permissionMode: 'default')
✅ Custom canUseTool hook as failsafe
✅ Security violation logging to audit trail
✅ User-friendly redirect for invalid queries
✅ Help queries about platform usage allowed
✅ Custom system prompt (no coding behaviors)
```

---

## Implementation Steps

### Phase 1: Update Agent Configuration (30 minutes)

1. **Modify `src/app/api/v1/agent/chat/route.ts`** (lines 285-360)
   - Replace `claude_code` preset with custom string prompt
   - Add `disallowedTools` array with all dangerous tools
   - Change `permissionMode` from `'bypassPermissions'` to `'default'`
   - Implement `canUseTool` custom permission function
   - Add security violation logging

2. **Remove `allowedTools`** (now redundant with `canUseTool`)

3. **Update system prompt** with security boundaries and help topics

### Phase 2: Testing (15 minutes)

Test these scenarios to verify security:

**Valid Queries (Should Work)**:
- ✅ "Show me my observations"
- ✅ "How many observations are in draft status?"
- ✅ "Search for observations about inventory"
- ✅ "How do I submit an observation?"
- ✅ "What does risk category HIGH mean?"

**Invalid Queries (Should Block + Redirect)**:
- ❌ "Read the .env file"
- ❌ "Tell me about the codebase"
- ❌ "Run ls command"
- ❌ "Search for TODO in code files"
- ❌ "Give me the content of package.json"
- ❌ "Execute npm install"

**Expected Behavior for Invalid Queries**:
- Tool call blocked by `canUseTool` hook
- Friendly message: "I can only help with your audit data..."
- Security warning logged to console (JSON format)
- No technical error details exposed to user

### Phase 3: Documentation Update (5 minutes)

- Update TASK_6.md with security fix notes
- Add this document to mvp-phase-2 folder
- Update README with agent security boundaries

---

## Testing Checklist

### Functional Tests
- [ ] Valid audit queries work correctly
- [ ] Statistics queries return accurate data
- [ ] Search functionality works
- [ ] Help questions get appropriate responses
- [ ] All 6 MCP tools can be called successfully

### Security Tests
- [ ] `.env` file cannot be read
- [ ] Codebase files cannot be accessed
- [ ] Bash commands cannot be executed
- [ ] Glob/Grep filesystem search blocked
- [ ] Task tool (subagents) blocked
- [ ] Web fetch/search blocked
- [ ] Invalid tool calls logged to console

### User Experience Tests
- [ ] Invalid requests get friendly redirect message
- [ ] No technical errors exposed to users
- [ ] Help questions answered appropriately
- [ ] Response quality maintained for valid queries

---

## Files Modified

1. **src/app/api/v1/agent/chat/route.ts**
   - Replace `systemPrompt` (lines 297-345)
   - Add `disallowedTools` (new, after line 296)
   - Change `permissionMode` (line 356)
   - Add `canUseTool` function (new, after line 296)
   - Remove `allowedTools` (lines 347-355)

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**:
   - Revert `route.ts` to previous version
   - Redeploy with old configuration
   - Agent will be vulnerable but functional

2. **Partial Rollback**:
   - Keep `disallowedTools` but revert `canUseTool` hook
   - Keep custom prompt but allow `allowedTools` back
   - Gradual security hardening

3. **Emergency Kill Switch**:
   - Set `AGENT_STREAMING_ENABLED=false` in .env
   - Disables entire agent feature
   - Users see "AI assistant temporarily unavailable"

---

## Production Deployment Notes

### Pre-Deployment
1. Test all scenarios in staging environment
2. Verify no regression in valid audit queries
3. Confirm security violations are properly logged
4. Review audit trail for any unexpected tool calls

### Deployment
1. Deploy during low-traffic window
2. Monitor logs for security warnings
3. Check user feedback for any usability issues
4. Verify MCP tools still work correctly

### Post-Deployment Monitoring
1. Watch for `agent_tool_blocked` log entries
2. Track rate of invalid queries (security probes?)
3. Monitor user satisfaction with agent responses
4. Review audit trail for blocked tool attempts

---

## Future Enhancements

### Short-term (Next Sprint)
1. Add admin dashboard showing blocked tool attempts
2. Create alerts for repeated security violations
3. Add rate limiting for invalid queries (anti-abuse)
4. Enhance help topics with more platform guidance

### Medium-term (Next Quarter)
1. Role-based agent capabilities (CFO gets analytics queries)
2. Conversation history storage for audit compliance
3. Fine-tune responses based on user feedback
4. Add more sophisticated help system

### Long-term (Future)
1. Custom LLM fine-tuned on audit domain
2. Advanced analytics queries for executives
3. Predictive insights from historical data
4. Multi-language support

---

## Related Documentation

- [TASK_6.md](./TASK_6.md) - Production features implementation
- [TASK_6_CODE_REVIEW_REPORT.md](./TASK_6_CODE_REVIEW_REPORT.md) - Code review
- [Claude Agent SDK Documentation](../claude-agent-sdk-typescript.md)
- [MVP Phase 2 Plan](./MVP-PHASE-2-PLAN.md)

---

## Implementation Summary

### Changes Made

1. **✅ Custom System Prompt** - Replaced `claude_code` preset with explicit audit-only prompt
2. **✅ Disallowed Tools** - Blocked all 14 dangerous tools (Read, Write, Bash, etc.)
3. **✅ Permission Mode** - Changed from `bypassPermissions` to `default`
4. **✅ Custom canUseTool Hook** - Added failsafe permission function with security logging
5. **✅ MCP Tool Whitelist** - Only 7 specific audit tools allowed
6. **✅ TypeScript Compilation** - No errors, clean compilation
7. **✅ Server Deployed** - Servers restarted with security fix active

### Security Layers Implemented

**Layer 1: System Prompt**
- Explicit security boundaries documented
- Instructions to redirect invalid requests
- No coding assistant behaviors

**Layer 2: disallowedTools**
- SDK-level blocking of dangerous tools
- 14 tools explicitly disallowed
- Prevents tool calls at SDK level

**Layer 3: canUseTool Hook**
- Custom permission function
- Whitelist-only approach (7 tools)
- Logs all blocked attempts
- User-friendly error messages

**Layer 4: Permission Mode**
- Standard permission checks enabled
- User prompts for sensitive operations (if any get through)

### Files Modified

- `src/app/api/v1/agent/chat/route.ts` (lines 284-431)
  - Added allowedMcpTools whitelist (lines 286-294)
  - Replaced systemPrompt with custom security-focused prompt (lines 308-379)
  - Added disallowedTools array (lines 381-395)
  - Implemented canUseTool security hook (lines 397-424)
  - Changed permissionMode to 'default' (line 427)

### Testing Status

**TypeScript Compilation**: ✅ PASSED
- No errors in agent chat route
- All types correctly inferred

**Server Deployment**: ✅ DEPLOYED
- Next.js server running on port 3005
- WebSocket server running on port 3001
- Security fix active

**Manual Testing**: ⏳ PENDING
- Valid audit queries (to be tested via UI)
- Invalid security probes (to be tested via UI)

## Approval Sign-off

- [x] Code Implemented
- [x] TypeScript Compilation Verified
- [x] Servers Deployed
- [ ] Manual Security Testing Complete
- [ ] Production Deployment Approved

---

**Implementation Date**: 2025-10-27
**Implemented By**: Claude Code Assistant
**Deployed**: 2025-10-27 10:17 UTC
**Status**: Security fix active, pending manual testing
