import { useJumpStore } from '@/reader/jump-store';
import type { Locator } from '@/reader/locator';

const at = (page: number): Locator => ({ scheme: 'pdf', page, offset: 0 });

beforeEach(() => {
  useJumpStore.setState({ request: null, returnStack: [] });
});

describe('requestJump', () => {
  it('records the target page for a book', () => {
    useJumpStore.getState().requestJump('book-1', at(42));

    expect(useJumpStore.getState().request).toMatchObject({ bookId: 'book-1', page: 42 });
  });

  it('gives every request a new nonce, even for the page already showing', () => {
    // Without this the request object is value-equal and the reader's effect, which
    // keys on it, never refires — so tapping the same contents row twice does nothing.
    const { requestJump } = useJumpStore.getState();

    requestJump('book-1', at(42));
    const first = useJumpStore.getState().request?.nonce ?? 0;
    requestJump('book-1', at(42));
    const second = useJumpStore.getState().request?.nonce ?? 0;

    expect(second).toBeGreaterThan(first);
  });

  it('ignores a locator from a format that does not page', () => {
    useJumpStore.getState().requestJump('book-1', { scheme: 'epub', cfi: '/6/2!/4/2/1:0' });

    expect(useJumpStore.getState().request).toBeNull();
  });
});

describe('consume', () => {
  it('clears the request once the right book has applied it', () => {
    useJumpStore.getState().requestJump('book-1', at(42));
    useJumpStore.getState().consume('book-1');

    expect(useJumpStore.getState().request).toBeNull();
  });

  it('leaves a request belonging to another book alone', () => {
    useJumpStore.getState().requestJump('book-1', at(42));
    useJumpStore.getState().consume('book-2');

    expect(useJumpStore.getState().request).not.toBeNull();
  });
});

describe('return stack', () => {
  it('pops the most recent return point', () => {
    const { pushReturn, popReturn } = useJumpStore.getState();

    pushReturn('book-1', at(10));
    pushReturn('book-1', at(55));

    expect(popReturn('book-1')).toBe(55);
    expect(popReturn('book-1')).toBe(10);
    expect(popReturn('book-1')).toBeNull();
  });

  it('only pops points belonging to the asking book', () => {
    const { pushReturn, popReturn } = useJumpStore.getState();

    pushReturn('book-1', at(10));
    pushReturn('book-2', at(99));

    expect(popReturn('book-1')).toBe(10);
    expect(useJumpStore.getState().returnStack).toEqual([{ bookId: 'book-2', page: 99 }]);
  });

  it('caps the depth, dropping the oldest', () => {
    const { pushReturn } = useJumpStore.getState();
    for (let page = 1; page <= 15; page += 1) pushReturn('book-1', at(page));

    const stack = useJumpStore.getState().returnStack;
    expect(stack).toHaveLength(10);
    expect(stack[0]?.page).toBe(6);
  });
});

describe('clearJumps', () => {
  it('drops a book’s request and return points on unmount', () => {
    const { requestJump, pushReturn, clearJumps } = useJumpStore.getState();

    requestJump('book-1', at(42));
    pushReturn('book-1', at(7));
    clearJumps('book-1');

    expect(useJumpStore.getState().request).toBeNull();
    expect(useJumpStore.getState().returnStack).toEqual([]);
  });

  it('leaves another book’s state intact', () => {
    const { requestJump, pushReturn, clearJumps } = useJumpStore.getState();

    requestJump('book-2', at(42));
    pushReturn('book-2', at(7));
    clearJumps('book-1');

    expect(useJumpStore.getState().request).not.toBeNull();
    expect(useJumpStore.getState().returnStack).toHaveLength(1);
  });
});
