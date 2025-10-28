/**
 * Test script for search_observations tool
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testSearchObservations() {
  console.log('🔍 Testing search_observations tool...\n');

  try {
    console.log('Sending query: "Search for observations containing water"');
    console.log('-----------------------------------------------------------\n');

    const messages: any[] = [];

    for await (const message of query({
      prompt: 'Search for observations containing water',
      options: {
        allowedTools: ['search_observations'],
        permissionMode: 'bypassPermissions',
      }
    })) {
      messages.push(message);

      // Log the message type
      if (message.type === 'text') {
        console.log('📝 Text Response:', message.text);
      } else if (message.type === 'tool_use') {
        console.log('🔧 Tool Used:', message.name);
        console.log('   Input:', JSON.stringify(message.input, null, 2));
      } else if (message.type === 'tool_result') {
        console.log('✅ Tool Result:', message.content);
      }
    }

    console.log('\n✅ Test Completed Successfully!');
    console.log(`Total messages received: ${messages.length}`);

    return true;
  } catch (error: any) {
    console.error('\n❌ Test Failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    return false;
  }
}

// Run the test
testSearchObservations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
