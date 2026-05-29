import { Agent } from '@google/adk';
import { storyTellerAgent } from './storyTeller';
import { calculateSum, CalculateSumSchema } from '../tools';

/**
 * Coordinator Agent definition
 * Acts as the parent orchestrator delegating to sub-agents or running tool calls.
 */
export const coordinatorAgent = new Agent({
  name: 'Coordinator',
  model: 'gemini-2.5-flash',
  instruction: `
    You are the primary coordinator agent for the Fahem system.
    You supervise task execution, delegate creative writing to the StoryTeller agent,
    and make tool calls to calculate sums when requested.
    Always enforce masking of usernames and passwords.
  `,
  // Register sub-agents
  agents: [storyTellerAgent],
  // Register tools
  tools: [
    {
      name: 'calculateSum',
      description: 'Calculates the sum of two numbers',
      schema: CalculateSumSchema,
      handler: calculateSum,
    },
  ],
});
