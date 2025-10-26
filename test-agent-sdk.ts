/**
 * Test file to verify Claude Agent SDK installation and check for Zod version conflicts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testAgentSDK() {
  console.log('Testing Claude Agent SDK installation...\n');

  try {
    // Simple test query
    console.log('Sending test query to Claude...');

    const messages: any[] = [];

    for await (const message of query({
      prompt: 'Hello! Please respond with "SDK is working!" and nothing else.',
      options: {
        // Use minimal options for basic test
        allowedTools: [],
        permissionMode: 'bypassPermissions',
      }
    })) {
      messages.push(message);
      console.log('Received message:', JSON.stringify(message, null, 2));
    }

    console.log('\n✅ SDK Test Completed Successfully!');
    console.log(`Total messages received: ${messages.length}`);

    return true;
  } catch (error: any) {
    console.error('\n❌ SDK Test Failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    // Check specifically for Zod-related errors
    if (error.message?.includes('zod') || error.message?.includes('Zod')) {
      console.error('\n⚠️  This appears to be a Zod version conflict issue!');
    }

    return false;
  }
}

// Run the test
testAgentSDK()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
