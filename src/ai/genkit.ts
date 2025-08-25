import { genkit, ModelReference } from 'genkit';
import { openAI } from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      apiHost: 'api.perplexity.ai',
    }),
  ],
  logLevel: 'debug',
});
