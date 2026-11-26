import {
  createLoggerForModule,
  getTraceContext,
} from '@futuristic.digital/logger';


import {
  hasStreamingParts,
  idiRequestBodySchema,
  type IDIChatMessage,
} from '../api-contracts.js';
import { streamAgentTurn, type AgentGenerationSettings } from '../generation/agent-turn.stream.js';
import { defaultAgentSettings } from './default.instructions.js';

const logger = createLoggerForModule(import.meta.url);
const messageUpdateFailure = 'Message update failed';

/** Receives a complete message once per logical update rather than per token. */
export type OnMessageUpdate = (message: IDIChatMessage) => void | Promise<void>;

/** Host-supplied configuration for an IDI agent. */
export type IDIAgentOptions = AgentGenerationSettings & {
  /** Appended to the shared base instructions from {@link defaultAgentSettings}. */
  instructions?: string;

  /** Return a promise to wait for a write, or schedule background work in the host and return void. */
  onMessageUpdate?: OnMessageUpdate;
};

/**
 * Configures and runs an IDI backend response generator.
 *
 * Each generation request runs one LLM turn (`streamText`). Tools are not
 * executed on the server; the client can send finalized component output in
 * a later generation request.
 *
 * Appends custom `instructions` to the shared base prompt so every agent keeps
 * the same tool-use rules.
 */
export class IDIAgent {
  private readonly generationSettings: AgentGenerationSettings;
  private readonly instructions: string;

  private readonly onMessageUpdate?: OnMessageUpdate;

  constructor({
    model,
    providerOptions,
    reasoning,
    temperature,
    maxOutputTokens,
    instructions: additionalInstructions,

    onMessageUpdate,
  }: IDIAgentOptions) {
    this.generationSettings = {
      model,
      providerOptions,
      reasoning,
      temperature,
      maxOutputTokens,
    };

    this.onMessageUpdate = onMessageUpdate;

    const defaultInstructionsTrimmed = defaultAgentSettings.instructions
      .toString()
      .trim();
    const additionalInstructionsTrimmed = additionalInstructions
      ?.toString()
      .trim();
    this.instructions =
      defaultInstructionsTrimmed +
      (additionalInstructionsTrimmed ? '\n\n' : '') +
      (additionalInstructionsTrimmed ?? '');
  }

  /** Streams a model turn or acknowledges a component update. */
  public async handleChatRequest(body: unknown): Promise<Response> {
    const requestLogger = logger.child(getTraceContext());
    const parsedBody = await idiRequestBodySchema.safeParseAsync(body);

    if (!parsedBody.success) {
      requestLogger.warn('Invalid idi payload');
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const request = parsedBody.data;
    const publishUpdate = async (message: IDIChatMessage) => {
      try {
        await this.onMessageUpdate?.(message);
      } catch (error) {
        requestLogger.error(messageUpdateFailure, { error });
        // Do not disclose errors from the host's storage to chat clients.
        throw new Error(messageUpdateFailure, { cause: error });
      }
    };

    try {
      if ('message' in request) {
        await publishUpdate(request.message);
        return new Response(null, { status: 204 });
      }

      // History is not a batch of updates. A component follow-up already reported
      // its final assistant snapshot before requesting this turn.
      const latest = request.messages.at(-1);
      if (latest?.role === 'user' && !hasStreamingParts(latest)) {
        await publishUpdate(latest);
      }
    } catch {
      return Response.json({ error: messageUpdateFailure }, { status: 500 });
    }

    requestLogger.info('Generating IDI response', {
      messageCount: request.messages.length,
    });
    return streamAgentTurn(
      request,
      { ...this.generationSettings, instructions: this.instructions },
      this.onMessageUpdate ? publishUpdate : undefined
    );
  }
}
