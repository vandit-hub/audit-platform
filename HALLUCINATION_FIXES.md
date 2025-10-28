# Hallucination Reduction Improvements

## Problem
The Claude AI model was hallucinating additional search results. When `search_observations` tool returned 1 actual result, the model reported 13 results, claiming 12 others were "generic test observations that matched the search."

**Database Reality**: Only 1 observation contains "water"
**Agent Claimed**: 13 observations found
**Root Cause**: Model was inferring/extrapolating beyond actual tool results

## Solution: Three-Layer Approach

### 1. **Tool Description Enhancement** ✅
**File**: `src/agent/mcp-server.ts` (line 412)

**Before**:
```
"Search across observation text, risks, and feedback using keywords. Returns matching observations with truncated text."
```

**After**:
```
"Search for exact keyword matches across observation text, risks, and feedback. Returns ONLY the observations that actually match the search query - do not estimate or infer additional results. Each result in the response array is a real database record. The "count" field shows the exact number of matching observations found."
```

**Impact**: Makes it explicit in the tool definition that results are EXACT matches, not estimates.

### 2. **Response Format Improvement** ✅
**File**: `src/agent/mcp-server.ts` (lines 459-473)

**Added explicit metadata fields**:
```json
{
  "query": "water",
  "searchStatus": "completed",
  "exactCount": 1,
  "note": "This is the exact and complete list of observations matching your search. No results were omitted or inferred.",
  "observations": [...],
  "totalReturned": 1,
  "maxResultsAvailable": false,
  "message": "Found exactly 1 observation(s) matching \"water\". These are all the results that exist."
}
```

**Impact**: The JSON response now explicitly states:
- `exactCount`: The true total (not an estimate)
- `note`: Confirms this is complete and not extrapolated
- `message`: Restates the exact count in plain English
- Field names like `exactCount` vs `count` emphasize precision

### 3. **System Prompt Instructions** ✅
**File**: `src/app/api/v1/agent/chat/route.ts` (lines 436-443)

**Added "CRITICAL - SEARCH RESULT HANDLING" section**:
```
CRITICAL - SEARCH RESULT HANDLING (Anti-Hallucination):
- When using search_observations: ONLY report the observations actually returned by the tool
- The "exactCount" field in search results shows the TRUE total number of matching records
- Do NOT estimate, infer, or suggest additional results beyond what the tool returns
- If search_observations returns 1 result, report exactly 1 - do NOT mention hypothetical "other similar" results
- If a search returns no results, say "No observations found matching that search" - do not speculate
- Do NOT add commentary like "likely containing the search term in metadata" unless explicitly stated by the tool
- Always cite the exact count and only describe results that were actually returned
```

**Impact**: Directly instructs the model:
- Only use actual results (not inferred)
- Reference `exactCount` for the true total
- Avoid speculative commentary
- Don't suggest hypothetical additional matches

## How It Works Together

1. **Tool tells Claude**: "These are exact matches, don't infer more"
2. **Response reinforces**: "exactCount=1, this is complete, no omitted results"
3. **System prompt enforces**: "Only report what's in the response, use exactCount, don't speculate"

## Expected Outcome

When searching for "water" again:
- ✅ Will correctly report: "Found exactly 1 observation matching 'water': 'Tap water not working'"
- ❌ Will NOT report: "13 observations found" or "12 others likely containing water in metadata"
- ❌ Will NOT add speculative commentary about missing results

## Testing

Run the search again with the same query to verify the improvements:
```bash
# In browser: "Search for observations containing water"
# Expected: Exactly 1 result reported with no hallucinated additions
```

## Why This Approach?

This multi-layer approach addresses hallucination at different levels:
1. **Tool definition** - Prevents the SDK from suggesting loose matches
2. **Response format** - Makes actual data unmistakably clear
3. **System prompt** - Directly constrains model behavior

Each layer reinforces the others, significantly reducing the likelihood of hallucination.
