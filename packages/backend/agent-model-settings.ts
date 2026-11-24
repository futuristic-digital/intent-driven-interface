import { gateway, type LanguageModel, type streamText } from 'ai';

const GPT_OSS_20B_MODEL_NAME = 'gpt-oss-20b';

export type AgentGenerationSettings = Pick<
  Parameters<typeof streamText>[0],
  'providerOptions' | 'reasoning' | 'temperature' | 'maxOutputTokens'
> & { model: Extract<LanguageModel, object> };

export type IDIAgentModelSettings =
  | { name: typeof GPT_OSS_20B_MODEL_NAME }
  | ({ name: 'custom' } & AgentGenerationSettings);

/** Resolve the host's selection once, without applying Gateway defaults to custom models. */
export function resolveAgentModelSettings(
  config: IDIAgentModelSettings
): AgentGenerationSettings {
  if (!config || typeof config.name !== 'string') {
    throw new TypeError('IDIAgent requires a model configuration with a name.');
  }

  const { name } = config;

  if (name === 'custom') {
    const { model, providerOptions, reasoning, temperature, maxOutputTokens } =
      config;
    if (typeof model !== 'object' || model === null) {
      throw new TypeError(
        'A custom IDIAgent model must be an AI SDK model object.'
      );
    }
    return { model, providerOptions, reasoning, temperature, maxOutputTokens };
  }

  if (name === GPT_OSS_20B_MODEL_NAME) {
    return {
      model: gateway(`openai/gpt-oss-20b`),
      providerOptions: {
        gateway: {
          order: ['groq'],
          sort: 'ttft',
        },
      },
    };
  }

  throw new TypeError(`Unsupported IDIAgent model preset: ${name}`);
}
