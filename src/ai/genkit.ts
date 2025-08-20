import {genkit} from 'genkit';
import {openai} from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openai({
      apiKey: process.env.PERPLEXITY_API_KEY,
      apiHost: 'https://api.perplexity.ai',
    }),
  ],
  logLevel: 'debug',
  model: 'llama-3-sonar-large-32k-online',
});
