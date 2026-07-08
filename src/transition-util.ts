export const HIDE_TIME_MS = 200;
export const MOVE_TIME_MS = 500;

export interface TransitionTracker {
  transitionDone: () => void;
}

/**
 * Creates a tracker that resolves a Promise once all expected D3 transitions complete.
 */
export function createTransitionTracker(
  animate: boolean | undefined,
  totalItems: number,
  resolve: () => void,
): TransitionTracker {
  let pending = totalItems;
  if (!animate || pending === 0) {
    resolve();
  }
  return {
    transitionDone: () => {
      pending--;
      if (pending === 0) {
        resolve();
      }
    },
  };
}
