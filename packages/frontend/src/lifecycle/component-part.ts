import {
  type IDIChatMessage,
  type UIToolMetadata,
  uiToolMetadataSchema,
} from '@intent-driven-interface/backend/api-contracts';
import { generateId, type ToolUIPart } from 'ai';
import { z } from 'zod';

const COMPONENT_TOOL_TYPE_PREFIX = 'tool-';

type MessagePart = IDIChatMessage['parts'][number];

export const getComponentIdFromToolType = (
  toolType: ToolUIPart['type']
): string => toolType.slice(COMPONENT_TOOL_TYPE_PREFIX.length);

export const getToolTypeFromComponentId = (
  componentId: string
): ToolUIPart['type'] => `${COMPONENT_TOOL_TYPE_PREFIX}${componentId}`;

/** Narrows SDK parts to static tool invocations. Check registration separately. */
export const isComponentToolPart = (part: MessagePart): part is ToolUIPart =>
  part.type.startsWith(COMPONENT_TOOL_TYPE_PREFIX) && 'toolCallId' in part;

export const matchesComponentToolCall = (
  part: MessagePart | undefined,
  toolCallId: string
): part is ToolUIPart =>
  part !== undefined &&
  isComponentToolPart(part) &&
  part.toolCallId === toolCallId;

/** Reads only the supported IDI metadata from an SDK part. */
export const readToolMetadata = (part: {
  toolMetadata?: unknown;
}): UIToolMetadata => uiToolMetadataSchema.parse(part.toolMetadata ?? {});

export const generateInternalId = (): string => `internal_${generateId()}`;

export const createComponentToolPart = (
  componentId: string,
  input: unknown,
  inputOverride: unknown,
  resumeCaller: UIToolMetadata['resumeCaller']
): ToolUIPart => ({
  type: getToolTypeFromComponentId(componentId),
  toolCallId: generateInternalId(),
  state: 'output-available',
  output: undefined,
  input,
  toolMetadata: {
    ...(inputOverride === undefined
      ? {}
      : { componentInputState: z.json().parse(inputOverride) }),
    ...(resumeCaller ? { resumeCaller } : {}),
  },
});

/** Commits draft output once, preserving original input and the latest input state. */
export const finalizeComponentPart = (
  part: ToolUIPart,
  output?: unknown
): ToolUIPart => {
  const metadata = readToolMetadata(part);
  if (metadata.closedAt) return part;
  const { componentOutputState, ...retainedMetadata } = metadata;
  const closedAt = new Date().toISOString();
  // Keep provider call metadata needed for subsequent model turns, while SDK
  // output states can retain only approvals that were actually granted.
  const { approval, ...retainedPart } = part;
  return {
    ...retainedPart,
    state: 'output-available',
    input: part.input,
    output: output === undefined ? componentOutputState : output,
    errorText: undefined,
    ...(approval?.approved === true
      ? { approval: { ...approval, approved: approval.approved } }
      : {}),
    toolMetadata: {
      ...retainedMetadata,
      closedAt,
    },
  };
};
