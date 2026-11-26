import { createContext, useContext } from 'react';

export const DemoAIAvailability = createContext(false);

export function useDemoAIAvailable() {
  return useContext(DemoAIAvailability);
}
