import {
  createLoggerForModule,
  getTraceContext,
} from '@futuristic.digital/logger';
import {
  createUIMessageStreamResponse,
  generateId,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

import {
  type ClientTimeContext,
  type ComponentMapForBackend,
  type ComponentInputSnapshot,
  type PinnedIDIComponent,
  type UIMessageMetadata,
} from './api-contracts';
import { buildToolsFromComponentMap } from './build-tools';
import { canonicalizePinInputs } from './canonicalize-pin-inputs';
import {
  defaultAgentSettings,
  type IDIAgentSettings,
} from './default-agent-settings';
import { parseHandleChatRequestBody } from './handle-chat-request-body';
import { convertIDIMessagesToModelMessages } from './model-message.conversion';
import { trimMessagesForAgent } from './trim-messages-for-agent';

const logger = createLoggerForModule(import.meta.url);

export type IDIAgentSaveMessages = (opts: {
  messages: UIMessage[];
  userId: string;
}) => Promise<void>;

export type IDIAgentLoadMessages = (
  userId: string,
  opts?: { beforeTimestamp?: Date; limit?: number }
) => Promise<{ messages: UIMessage[]; hasOlderMessages: boolean }>;

export type IDIAgentLoadPinnedComponents = (
  userId: string
) => Promise<PinnedIDIComponent[]>;

export type IDIAgentPinComponent = (
  opts: ComponentInputSnapshot & {
    userId: string;
    componentId: string;
  }
) => Promise<void>;

/** Registers an already-started task with the host's request-lifetime scheduler. */
export type IDIAgentScheduleTask = (task: Promise<void>) => void;

/** App-specific overrides and host-owned persistence when constructing a {@link IDIAgent}. */
export type IDIAgentOptions = {
  model?: IDIAgentSettings['model'];
  /** Override provider controls when selecting a different model. */
  providerOptions?: IDIAgentSettings['providerOptions'];
  /** Appended to the shared base instructions from {@link defaultAgentSettings}. */
  instructions?: string;
  saveMessages: IDIAgentSaveMessages;
  loadMessages: IDIAgentLoadMessages;
  loadPinnedComponents: IDIAgentLoadPinnedComponents;
  pinComponent: IDIAgentPinComponent;
  /** Host owns task lifetime and failures; without this, generation saves are awaited. */
  scheduleTask?: IDIAgentScheduleTask;
};

export type IDIAgentHandleChatRequestOptions =
  | {
      operation: 'generate-response';
      messages: UIMessage[];
      componentMap: ComponentMapForBackend;
      clientTimeContext: ClientTimeContext;
    }
  | { operation: 'save-message'; message: UIMessage }
  | { operation: 'load-message-history'; beforeTimestamp?: string }
  | { operation: 'list-pinned-components' }
  | (ComponentInputSnapshot & {
      operation: 'pin-component';
      componentId: string;
    });

/**
 * Configures and runs an IDI backend response generator.
 *
 * Each request is a single LLM turn (`streamText`). Tool results are not
 * executed on the server — the client closes the loop when the user calls
 * `closeComponent`, which auto-sends the next request.
 *
 * Merges {@link defaultAgentSettings} with app-specific options. Custom
 * `instructions` are appended to the shared base prompt so every agent keeps
 * the same tool-use rules. Persistence is injected by the host app.
 */
export class IDIAgent {
  private readonly agentSettings: IDIAgentSettings;
  private readonly saveMessages: IDIAgentSaveMessages;
  private readonly loadMessages: IDIAgentLoadMessages;
  private readonly loadPinnedComponents: IDIAgentLoadPinnedComponents;
  private readonly pinComponent: IDIAgentPinComponent;
  private readonly scheduleTask: IDIAgentScheduleTask | undefined;

  constructor(options: IDIAgentOptions) {
    const {
      instructions: additionalInstructions,
      saveMessages,
      loadMessages,
      loadPinnedComponents,
      pinComponent,
      scheduleTask,
      ...settingsOverrides
    } = options;

    this.saveMessages = saveMessages;
    this.loadMessages = loadMessages;
    this.loadPinnedComponents = loadPinnedComponents;
    this.pinComponent = pinComponent;
    this.scheduleTask = scheduleTask;

    const defaultInstructionsTrimmed = defaultAgentSettings.instructions
      .toString()
      .trim();
    const additionalInstructionsTrimmed = additionalInstructions
      ?.toString()
      .trim();
    const instructions =
      defaultInstructionsTrimmed +
      (additionalInstructionsTrimmed ? '\n\n' : '') +
      (additionalInstructionsTrimmed ?? '');

    this.agentSettings = {
      ...defaultAgentSettings,
      ...settingsOverrides,
      instructions,
    };
  }

  /** Keeps generation saves alive through either the host scheduler or an awaited promise. */
  private async saveOrScheduleMessages(
    options: Parameters<IDIAgentSaveMessages>[0]
  ): Promise<void> {
    const task = this.saveMessages(options);
    if (this.scheduleTask) {
      this.scheduleTask(task);
    } else {
      await task;
    }
  }

  /** Validates an IDI POST body before dispatching the operation. */
  public async handleChatRequest(
    body: unknown,
    userId: string
  ): Promise<Response> {
    const requestLogger = logger.child(getTraceContext());
    const parsedBody = parseHandleChatRequestBody(body);

    if (!parsedBody.success) {
      requestLogger.warn('Invalid idi payload');
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    requestLogger.info('Handling idi request', {
      userId,
      operation: parsedBody.data.operation,
    });

    return this.handleValidChatRequest({ ...parsedBody.data, userId });
  }

  /**
   * Handles one IDI POST: generation stream, message upsert, history page,
   * or pinned-component list/pin.
   */
  private async handleValidChatRequest(
    props: IDIAgentHandleChatRequestOptions & { userId: string }
  ): Promise<Response> {
    const requestLogger = logger.child(getTraceContext());

    if (props.operation === 'generate-response') {
      const { messages, componentMap, userId, clientTimeContext } = props;

      requestLogger.info('Generating IDI response', {
        userId,
        messageCount: messages.length,
      });

      // Without a host scheduler, finish the inbound save before starting the stream.
      await this.saveOrScheduleMessages({ messages, userId });
      const tools = buildToolsFromComponentMap(componentMap);
      const messagesTrimmed = trimMessagesForAgent(messages);
      // Resolve relative dates against the user's browser clock, never the server clock.
      const userLocalDateTime = new Intl.DateTimeFormat('en-US', {
        timeZone: clientTimeContext.timeZone,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date(clientTimeContext.currentDateTime));

      // One LLM turn: emit text and/or tool calls, then stop; the client resumes with tool outputs.
      const stream = streamText({
        model: this.agentSettings.model,
        providerOptions: this.agentSettings.providerOptions,
        instructions: `${this.agentSettings.instructions}\n\nUser's current local time: ${userLocalDateTime} (timezone: ${clientTimeContext.timeZone}).`,
        messages: await convertIDIMessagesToModelMessages(messagesTrimmed),
        tools,
      });

      const uiMessageStream = toUIMessageStream({
        stream: stream.stream,
        tools,
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            const metadata: UIMessageMetadata = {
              timestamp: new Date().toISOString(),
            };
            return metadata;
          }

          return undefined;
        },

        // Backend-generated ids are required so onEnd can upsert by messageId.
        originalMessages: messages,
        generateMessageId: generateId,

        // Returning the promise lets the SDK await final persistence before stream closure.
        onEnd: ({ responseMessage }) =>
          this.saveOrScheduleMessages({ messages: [responseMessage], userId }),
      });

      return createUIMessageStreamResponse({ stream: uiMessageStream });
    }

    if (props.operation === 'save-message') {
      const { message, userId } = props;
      requestLogger.info('Saving IDI message', {
        userId,
        messageId: message.id,
      });
      await this.saveMessages({ messages: [message], userId });
      return new Response(null, { status: 200 });
    }

    if (props.operation === 'load-message-history') {
      const { beforeTimestamp, userId } = props;
      requestLogger.info('Loading IDI message history', {
        userId,
        beforeTimestamp,
      });
      const result = await this.loadMessages(
        userId,
        beforeTimestamp
          ? { beforeTimestamp: new Date(beforeTimestamp) }
          : undefined
      );
      return Response.json(result);
    }

    if (props.operation === 'list-pinned-components') {
      const { userId } = props;
      requestLogger.info('Listing pinned IDI components', { userId });
      const pinnedComponents = await this.loadPinnedComponents(userId);
      return Response.json({ pinnedComponents });
    }

    const { componentId, componentInput, componentInputState, userId } = props;
    requestLogger.info('Pinning IDI component', { userId, componentId });
    await this.pinComponent({
      userId,
      componentId,
      componentInput: canonicalizePinInputs(componentInput),
      ...(componentInputState === undefined
        ? {}
        : { componentInputState: canonicalizePinInputs(componentInputState) }),
    });
    // Host owns insert/conflict rules; return the authoritative list so clients
    // do not re-implement pin merge logic.
    const pinnedComponents = await this.loadPinnedComponents(userId);
    return Response.json({ pinnedComponents });
  }
}
