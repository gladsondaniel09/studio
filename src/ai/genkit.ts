
import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    }),
  ],
  logLevel: 'debug',
});
