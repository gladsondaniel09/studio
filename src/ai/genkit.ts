import {genkit} from 'genkit';
import {openAI} from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      apiHost: 'https://api.perplexity.ai',
      model: 'llama-3-sonar-large-32k-online',
    }),
  ],
  logLevel: 'debug',
});
