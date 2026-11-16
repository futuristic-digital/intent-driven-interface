import { type ComponentAsTool } from '../component-map/define-idi-component';

/** Resolves effective input without initializing or mutating the optional saved state. */
export const resolveComponentInput = <INPUT extends object>(
  component: Pick<ComponentAsTool<INPUT>, 'inputSchema'>,
  componentInput: unknown,
  componentInputState: unknown
): INPUT => component.inputSchema.parse(componentInputState ?? componentInput);
