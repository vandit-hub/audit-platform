/**
 * Detailed test to see exact tool response
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testSearchDetailed() {
  console.log('🔍 Testing search_observations with detailed output...\n');

  try {
    console.log('Sending query: "Search for observations containing water"');
    console.log('-----------------------------------------------------------\n');

    let toolUsed = false;
    let toolResponse: any = null;

    for await (const message of query({
      prompt: 'Search for observations containing water',
      options: {
        allowedTools: ['search_observations'],
        permissionMode: 'bypassPermissions',
      }
    })) {
      if (message.type === 'tool_use') {
        console.log('🔧 Tool Used:', message.name);
        console.log('📥 Tool Input:');
        console.log(JSON.stringify(message.input, null, 2));
        toolUsed = true;
      } else if (message.type === 'tool_result') {
        console.log('\n✅ Tool Result Received:');
        console.log(JSON.stringify(message.content, null, 2));
        toolResponse = message.content;
      }
    }

    if (toolResponse) {
      // Parse the tool response
      try {
        const parsed = JSON.parse(toolResponse);
        console.log('\n📊 Parsed Tool Response:');
        console.log('   Total observations returned:', parsed.count || parsed.observations?.length || 0);
        if (parsed.observations && Array.isArray(parsed.observations)) {
          console.log('   Observations list:');
          parsed.observations.forEach((obs: any, idx: number) => {
            console.log(`   [${idx + 1}] ${obs.id}: "${obs.observationText.substring(0, 50)}..."`);
          });
        }
      } catch (e) {
        console.log('   Raw response:', toolResponse);
      }
    }

    console.log('\n✅ Test Completed');

  } catch (error: any) {
    console.error('\n❌ Test Failed:');
    console.error('Error:', error.message);
  }
}

testSearchDetailed();
