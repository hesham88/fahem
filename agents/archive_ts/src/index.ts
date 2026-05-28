import { coordinatorAgent } from './agents/coordinator';

/**
 * Main execution entrypoint for Fahem ADK Agents
 */
async function main() {
  console.log('Initializing Fahem ADK multi-agent architecture...');
  
  // Set up mock process environment settings. Real keys must be accessed via GCP Secret Manager.
  const apiKey = process.env.GEMINI_API_KEY || '[MASKED_API_KEY]';
  console.log(`Using API key configuration: ${apiKey}`);

  try {
    const response = await coordinatorAgent.run({
      prompt: 'Calculate the sum of 12 and 34, then tell me a 1-sentence story about numbers.',
    });
    console.log('Agent execution response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error running coordinator agent:', error);
  }
}

main();
