import { z } from 'zod';

/**
 * Define parameter schemas using Zod for strict type checking
 */
export const CalculateSumSchema = z.object({
  a: z.number().describe('First number to add'),
  b: z.number().describe('Second number to add'),
});

export const SearchInfoSchema = z.object({
  query: z.string().describe('Search query for information retrieval'),
});

/**
 * Example ADK tool handlers
 */
export async function calculateSum(args: z.infer<typeof CalculateSumSchema>) {
  return { result: args.a + args.b };
}

export async function searchInfo(args: z.infer<typeof SearchInfoSchema>) {
  // Mock search results. Sensitive data (if any) must be masked.
  return {
    results: [
      { title: `Result for: ${args.query}`, snippet: 'This is a sample search retrieval mock output.' }
    ]
  };
}
