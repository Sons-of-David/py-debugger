import { createContext, useContext } from 'react';

export const AnimationContext = createContext<boolean>(true);

export function useAnimationEnabled(): boolean {
  return useContext(AnimationContext);
}
