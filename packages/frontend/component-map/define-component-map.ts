import { type ComponentAsTool } from './define-idi-component.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentMap = Record<string, ComponentAsTool<any, any>>;

/**
 * Identity helper that preserves a typed component map for `useIDI`.
 */
export const defineComponentMap = <COMPONENT_MAP>(map: COMPONENT_MAP) => map;
