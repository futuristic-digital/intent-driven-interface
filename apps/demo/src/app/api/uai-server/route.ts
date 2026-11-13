import {
  convertToModelMessages,
  jsonSchema,
  safeValidateUIMessages,
  tool,
  ToolLoopAgent,
  type ToolSet,
} from 'ai';
import { z } from 'zod';
import type { ComponentMapForServer } from '@uai/shared';
import { defaultAgentProps } from '../../../server/uai/agent';

const ComponentMapSchema = z.record(
  z.string(),
  z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    inputSchema: z.record(z.string(), z.json()),
    outputSchema: z.record(z.string(), z.json()).optional(),
    inputExamples: z.array(z.object({ input: z.json() })).optional(),
  })
) satisfies z.ZodType<ComponentMapForServer>;

const RequestSchema = z.object({
  messages: z.array(z.unknown()),
  componentMap: ComponentMapSchema,
});

/** Convert client component definitions into deferred UI tools and stream a turn. */
export async function POST(request: Request) {
  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: 'Valid messages and componentMap are required' },
      { status: 400 }
    );
  }

  const messages = await safeValidateUIMessages({
    messages: body.data.messages,
  });
  if (!messages.success) {
    return Response.json({ error: 'Invalid messages' }, { status: 400 });
  }

  const tools: ToolSet = {};
  for (const [key, component] of Object.entries(body.data.componentMap)) {
    tools[key] = tool({
      title: component.title,
      description: component.description,
      inputExamples: component.inputExamples,
      inputSchema: jsonSchema(component.inputSchema),
      outputSchema: component.outputSchema
        ? jsonSchema(component.outputSchema)
        : undefined,
      strict: true,
      supportsDeferredResults: true,
    });
  }

  const agent = new ToolLoopAgent({ ...defaultAgentProps, tools });
  const result = await agent.stream({
    messages: await convertToModelMessages(messages.data),
  });
  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) =>
      part.type === 'start'
        ? { timestamp: new Date().toISOString() }
        : undefined,
  });
}
