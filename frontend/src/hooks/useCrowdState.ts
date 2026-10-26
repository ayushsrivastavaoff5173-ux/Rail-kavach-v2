// src/hooks/useCrowdState.ts
'use client';

import { useCrowd } from '@/context/CrowdContext';

export const useCrowdState = () => {
  const context = useCrowd();
  return {
    ...context,
  };
};