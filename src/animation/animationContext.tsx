import { createContext, useContext } from 'react';

export const AnimationContext = createContext<{ enabled: boolean; duration: number }>({
  enabled: true,
  duration: 300,
});

export function useAnimationEnabled(): boolean {
  return useContext(AnimationContext).enabled;
}

export function useAnimationDuration(): number {
  return useContext(AnimationContext).duration;
}
