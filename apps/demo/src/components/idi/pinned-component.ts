import {
  schema,
  type ComponentRenderUIPart,
} from '@intent-driven-interface/frontend';

import {
  readBrowserStorage,
  writeBrowserStorage,
} from '../../utils/browser-storage';
import { componentMap } from './component-map';

const pinsStorageKey = 'flowdock.demo.pins';
export const maxDemoPins = 20;
const storedPinSchema = schema.object({
  componentId: schema.string(),
  componentInput: schema.unknown(),
});

function isRegisteredComponent(id: string): id is keyof typeof componentMap {
  return Object.hasOwn(componentMap, id);
}

export function readDemoPins(): DemoPinnedComponent[] {
  try {
    const raw = readBrowserStorage(pinsStorageKey);
    const stored: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(stored)) return [];
    return stored.slice(0, maxDemoPins).flatMap((entry: unknown) => {
      const pin = storedPinSchema.safeParse(entry);
      if (!pin.success) return [];
      const { componentId, componentInput } = pin.data;
      if (!isRegisteredComponent(componentId)) return [];
      const component = componentMap[componentId];
      if (component.disableStandaloneOpen) return [];
      const parsedInput = component.inputSchema.safeParse(componentInput);
      return parsedInput.success
        ? [createDemoPin(componentId, parsedInput.data)]
        : [];
    });
  } catch {
    return [];
  }
}

export function saveDemoPins(pins: DemoPinnedComponent[]): void {
  writeBrowserStorage(
    pinsStorageKey,
    JSON.stringify(
      pins.map(({ componentId, componentInput }) => ({
        componentId,
        componentInput,
      }))
    )
  );
}

export type DemoPinnedComponent = {
  id: string;
  componentId: keyof typeof componentMap;
  componentInput: ComponentRenderUIPart<typeof componentMap>['componentInput'];
};

export type PinDemoComponent = (
  componentId: DemoPinnedComponent['componentId'],
  componentInput: DemoPinnedComponent['componentInput']
) => void;

export function getDemoPinId(
  componentId: DemoPinnedComponent['componentId'],
  componentInput: DemoPinnedComponent['componentInput']
): string {
  // Ignore object key order, but preserve array order.
  return JSON.stringify(
    [componentId, componentInput],
    (_key, value: unknown) =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0
            )
          )
        : value
  );
}

export function createDemoPin(
  componentId: DemoPinnedComponent['componentId'],
  componentInput: DemoPinnedComponent['componentInput']
): DemoPinnedComponent {
  return {
    id: getDemoPinId(componentId, componentInput),
    componentId,
    componentInput: structuredClone(componentInput),
  };
}
