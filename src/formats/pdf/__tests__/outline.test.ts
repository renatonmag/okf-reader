import { normalizeOutline } from '@/formats/pdf/outline';
import { parseLocator } from '@/reader/locator';

describe('normalizeOutline', () => {
  it('converts pdfium 0-based page indices to 1-based locators', () => {
    const toc = normalizeOutline([{ title: 'Chapter 1', pageIdx: 0, children: [] }], 100);

    expect(toc).toEqual([{ label: 'Chapter 1', locator: 'pdf:1#0', children: [] }]);
  });

  it('accepts the string pageIdx iOS sends, despite the declared number type', () => {
    const toc = normalizeOutline(
      [{ title: 'Preface', pageIdx: '11', mNativePtr: '', children: [] }],
      100,
    );

    expect(toc[0]?.locator).toBe('pdf:12#0');
  });

  it('drops mNativePtr, which is a live pointer value on Android', () => {
    const toc = normalizeOutline([{ title: 'Intro', pageIdx: 4, mNativePtr: 140234881 }], 50);

    expect(toc[0]).not.toHaveProperty('mNativePtr');
  });

  it('keeps the outline nested', () => {
    const toc = normalizeOutline(
      [
        {
          title: 'Part I',
          pageIdx: 0,
          children: [
            { title: 'Chapter 1', pageIdx: 2, children: [{ title: '1.1', pageIdx: 3 }] },
            { title: 'Chapter 2', pageIdx: 9 },
          ],
        },
      ],
      100,
    );

    expect(toc).toHaveLength(1);
    expect(toc[0]?.children.map((child) => child.label)).toEqual(['Chapter 1', 'Chapter 2']);
    expect(toc[0]?.children[0]?.children[0]?.locator).toBe('pdf:4#0');
  });

  it('keeps an untitled entry so its children keep their nesting', () => {
    const toc = normalizeOutline(
      [{ title: '   ', pageIdx: 6, children: [{ title: 'Buried', pageIdx: 7 }] }],
      100,
    );

    expect(toc[0]?.label).toBe('Page 7');
    expect(toc[0]?.children[0]?.label).toBe('Buried');
  });

  it('refuses a title that is not a string rather than stringifying it', () => {
    // Bridge data is untyped in fact; String({}) would label the entry
    // '[object Object]', which is worse than admitting we have no title.
    const toc = normalizeOutline(
      [
        { title: { text: 'Chapter 1' }, pageIdx: 2 },
        { title: 42, pageIdx: 3 },
        { title: null, pageIdx: 4 },
      ],
      100,
    );

    expect(toc.map((entry) => entry.label)).toEqual(['Page 3', 'Page 4', 'Page 5']);
  });

  it('clamps a page index past the end of the document', () => {
    const toc = normalizeOutline([{ title: 'Colophon', pageIdx: 4000 }], 12);

    expect(toc[0]?.locator).toBe('pdf:12#0');
  });

  it('falls back to page 1 for a negative or unparseable page index', () => {
    // iOS builds pageIdx from indexForPage: with no nil-destination guard.
    const toc = normalizeOutline(
      [
        { title: 'Negative', pageIdx: -3 },
        { title: 'Garbage', pageIdx: 'NaN' },
        { title: 'Missing' },
      ],
      100,
    );

    expect(toc.map((entry) => entry.locator)).toEqual(['pdf:1#0', 'pdf:1#0', 'pdf:1#0']);
  });

  it('tolerates children that are not an array', () => {
    const toc = normalizeOutline([{ title: 'Odd', pageIdx: 1, children: 'nope' }], 10);

    expect(toc[0]?.children).toEqual([]);
  });

  it('returns nothing for input that is not an array', () => {
    expect(normalizeOutline(undefined, 10)).toEqual([]);
    expect(normalizeOutline(null, 10)).toEqual([]);
    expect(normalizeOutline('loadComplete|4|…', 10)).toEqual([]);
    expect(normalizeOutline({ title: 'not a list' }, 10)).toEqual([]);
  });

  it('skips entries that are not objects', () => {
    const toc = normalizeOutline([null, 'x', 7, { title: 'Real', pageIdx: 0 }], 10);

    expect(toc).toHaveLength(1);
    expect(toc[0]?.label).toBe('Real');
  });

  it('stops descending past the depth cap', () => {
    // 20 levels of single-child nesting.
    let node: Record<string, unknown> = { title: 'leaf', pageIdx: 0 };
    for (let i = 0; i < 20; i += 1) node = { title: `level ${i}`, pageIdx: 0, children: [node] };

    let depth = 0;
    for (let entry = normalizeOutline([node], 10)[0]; entry; entry = entry.children[0]) depth += 1;

    expect(depth).toBe(8);
  });

  it('caps the total number of entries', () => {
    const many = Array.from({ length: 6000 }, (_, i) => ({ title: `Entry ${i}`, pageIdx: i }));

    expect(normalizeOutline(many, 6000)).toHaveLength(5000);
  });

  it('emits locators that parse back', () => {
    const toc = normalizeOutline(
      [{ title: 'A', pageIdx: 0, children: [{ title: 'B', pageIdx: '41' }] }],
      100,
    );

    expect(parseLocator(toc[0].locator)).toEqual({ scheme: 'pdf', page: 1, offset: 0 });
    expect(parseLocator(toc[0].children[0].locator)).toEqual({
      scheme: 'pdf',
      page: 42,
      offset: 0,
    });
  });

  it('lets two entries on the same page share a locator', () => {
    // "Part II" and "Chapter 4" really can both start on page 87. Locators are not
    // identities — the contents list keys off its own positional path instead.
    const toc = normalizeOutline(
      [
        { title: 'Part II', pageIdx: 86 },
        { title: 'Chapter 4', pageIdx: 86 },
      ],
      200,
    );

    expect(toc[0]?.locator).toBe('pdf:87#0');
    expect(toc[1]?.locator).toBe('pdf:87#0');
  });

  it('preserves source order', () => {
    const toc = normalizeOutline(
      [
        { title: 'Third', pageIdx: 30 },
        { title: 'First', pageIdx: 0 },
        { title: 'Second', pageIdx: 10 },
      ],
      100,
    );

    expect(toc.map((entry) => entry.label)).toEqual(['Third', 'First', 'Second']);
  });

  it('survives a page count of zero', () => {
    const toc = normalizeOutline([{ title: 'Only', pageIdx: 5 }], 0);

    expect(toc[0]?.locator).toBe('pdf:1#0');
  });
});
