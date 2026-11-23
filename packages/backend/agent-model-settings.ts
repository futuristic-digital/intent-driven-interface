import { gateway, type LanguageModel, type streamText } from 'ai';

const OPENAI_LUNA_FAST_MODEL_NAME = 'gpt-6-luna-fast';
const QWEN_14B_MODEL_NAME = 'qwen-3-14b';
const QWEN_3_5_FLASH_MODEL_NAME = 'qwen3.5-flash';
const PRESET_MAX_OUTPUT_TOKENS = 4096;

export type AgentGenerationSettings = Pick<
  Parameters<typeof streamText>[0],
  'providerOptions' | 'reasoning' | 'temperature' | 'maxOutputTokens'
> & { model: Extract<LanguageModel, object> };

export type IDIAgentModelSettings =
  | {
      name: typeof OPENAI_LUNA_FAST_MODEL_NAME;
      reasoningEffort?: 'low' | 'medium' | 'high';
    }
  | {
      name: typeof QWEN_14B_MODEL_NAME | typeof QWEN_3_5_FLASH_MODEL_NAME;
      reasoning?: 'on' | 'off';
    }
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

  if (name === QWEN_14B_MODEL_NAME || name === QWEN_3_5_FLASH_MODEL_NAME) {
    return {
      model: gateway(`alibaba/${name}`),
      maxOutputTokens: PRESET_MAX_OUTPUT_TOKENS,
      reasoning: config.reasoning === 'off' ? 'none' : 'low',
    };
  }

  if (name === OPENAI_LUNA_FAST_MODEL_NAME) {
    return {
      model: gateway('openai/gpt-6-luna-fast'),
      maxOutputTokens: PRESET_MAX_OUTPUT_TOKENS,
      reasoning: config.reasoningEffort ?? 'low',
    };
  }

  throw new TypeError(`Unsupported IDIAgent model preset: ${name}`);
}
