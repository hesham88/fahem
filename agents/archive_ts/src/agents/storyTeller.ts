import { Agent } from '@google/adk';

/**
 * StoryTeller Sub-Agent definition
 */
export const storyTellerAgent = new Agent({
  name: 'StoryTeller',
  model: 'gemini-2.5-flash',
  instruction: `
    You are a creative writer sub-agent in the Fahem Agentic system.
    Your job is to generate a short, beautiful story based on a given prompt.
    Ensure that any local context names, URLs, or configurations are kept fully secure and masked.
  `,
  outputKey: 'story',
});
