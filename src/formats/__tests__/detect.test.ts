import { DETECT_HEADER_BYTES, detectFormat } from '@/formats/detect';

function header(build: (bytes: Uint8Array) => void): Uint8Array {
  const bytes = new Uint8Array(DETECT_HEADER_BYTES);
  build(bytes);
  return bytes;
}

function write(bytes: Uint8Array, offset: number, ascii: string) {
  for (let i = 0; i < ascii.length; i += 1) bytes[offset + i] = ascii.charCodeAt(i);
}

const pdfHeader = header((bytes) => write(bytes, 0, '%PDF-1.7'));
const zipHeader = header((bytes) => {
  bytes.set([0x50, 0x4b, 0x03, 0x04], 0);
  write(bytes, 30, 'mimetypeapplication/epub+zip');
});
const mobiHeader = header((bytes) => {
  write(bytes, 0, 'A Book Title');
  write(bytes, 60, 'BOOKMOBI');
});

describe('detectFormat', () => {
  it('identifies a PDF', () => {
    expect(detectFormat(pdfHeader)).toBe('pdf');
  });

  it('identifies an EPUB by its zip signature', () => {
    expect(detectFormat(zipHeader)).toBe('epub');
  });

  it('identifies a MOBI by its type/creator marker at offset 60', () => {
    expect(detectFormat(mobiHeader)).toBe('mobi');
  });

  it('identifies older PalmDOC ebooks as mobi', () => {
    const palmdoc = header((bytes) => write(bytes, 60, 'TEXtREAd'));
    expect(detectFormat(palmdoc)).toBe('mobi');
  });

  it('trusts the bytes over the extension', () => {
    // A PDF that someone renamed to .epub. Detection never sees the name, so the
    // right parser gets the file either way.
    expect(detectFormat(pdfHeader)).toBe('pdf');
  });

  it('returns null for something that is not a book', () => {
    expect(detectFormat(header((bytes) => write(bytes, 0, 'not a book at all')))).toBeNull();
  });

  it('does not read past a short header', () => {
    expect(detectFormat(new Uint8Array([0x25, 0x50]))).toBeNull();
  });
});
