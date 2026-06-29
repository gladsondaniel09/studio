import Anthropic from '@anthropic-ai/sdk';

/**
 * Shared Anthropic client for forensic audit-log analysis.
 * Reads ANTHROPIC_API_KEY from the environment (set it in apphosting.yaml /
 * Vercel project env vars). Claude Opus 4.8 is our most capable model for the
 * multi-step reasoning these CTRM forensic flows require.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ANALYSIS_MODEL = 'claude-opus-4-8';
