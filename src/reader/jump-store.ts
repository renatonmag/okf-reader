/**
 * Carries a "go to this locator" request from the contents modal to the reader
 * underneath it, and remembers where the reader was so it can get back.
 *
 * A store rather than navigation state because expo-router has no return channel:
 * `router.setParams` writes only the current route, and replacing back onto
 * `/book/[id]` would mount a second reader and reload the document. The modal sits on
 * top of a still-mounted reader, so a shared store reaches it directly.
 */

import { create } from 'zustand';

import type { Locator } from '@/reader/locator';

export interface JumpRequest {
  readonly bookId: string;
  readonly page: number;
  /**
   * Makes every request distinct. Without it, asking to jump to the page you are
   * already on produces a value-equal object and the reader's effect never refires.
   */
  readonly nonce: number;
}

interface ReturnPoint {
  readonly bookId: string;
  readonly page: number;
}

/** Deep enough for real back-jumping, shallow enough not to be a history feature. */
const MAX_RETURN_DEPTH = 10;

interface JumpStore {
  request: JumpRequest | null;
  returnStack: readonly ReturnPoint[];
  requestJump: (bookId: string, locator: Locator) => void;
  /** Clears the request once the reader has applied it. */
  consume: (bookId: string) => void;
  pushReturn: (bookId: string, locator: Locator) => void;
  /** The page to go back to, removed from the stack. Null when there is none. */
  popReturn: (bookId: string) => number | null;
  /** Drops everything for a book — on unmount, so a stale jump cannot fire later. */
  clearJumps: (bookId: string) => void;
}

let nextNonce = 1;

export const useJumpStore = create<JumpStore>((set, get) => ({
  request: null,
  returnStack: [],

  requestJump: (bookId, locator) => {
    if (locator.scheme !== 'pdf') return;
    nextNonce += 1;
    set({ request: { bookId, page: locator.page, nonce: nextNonce } });
  },

  consume: (bookId) => {
    if (get().request?.bookId === bookId) set({ request: null });
  },

  pushReturn: (bookId, locator) => {
    if (locator.scheme !== 'pdf') return;
    set((state) => ({
      returnStack: [...state.returnStack, { bookId, page: locator.page }].slice(-MAX_RETURN_DEPTH),
    }));
  },

  popReturn: (bookId) => {
    const stack = get().returnStack;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const point = stack[i];
      if (point?.bookId !== bookId) continue;
      set({ returnStack: [...stack.slice(0, i), ...stack.slice(i + 1)] });
      return point.page;
    }
    return null;
  },

  clearJumps: (bookId) =>
    set((state) => ({
      request: state.request?.bookId === bookId ? null : state.request,
      returnStack: state.returnStack.filter((point) => point.bookId !== bookId),
    })),
}));

/** How many places this book can jump back to. Drives the "back to page N" pill. */
export function useReturnDepth(bookId: string): number {
  return useJumpStore(
    (state) => state.returnStack.filter((point) => point.bookId === bookId).length,
  );
}
