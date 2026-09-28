import type { ExpoConfig } from 'expo/config';

/**
 * Book MIME types okf-reader can be handed a file for. Kept in one place because
 * Android intent filters and iOS document types must agree.
 */
const BOOK_MIME_TYPES = [
  'application/epub+zip',
  'application/pdf',
  'application/x-mobipocket-ebook',
] as const;

const config: ExpoConfig = {
  name: 'okf-reader',
  slug: 'okf-reader',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'okf',
  userInterfaceStyle: 'automatic',

  ios: {
    bundleIdentifier: 'dev.okf.reader',
    icon: './assets/expo.icon',
    supportsTablet: true,
    infoPlist: {
      // Lets books be opened from Files, Mail and Safari via "Open in…".
      // The share-extension target is a separate build target and is not set up yet.
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: false,
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'EPUB Book',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['org.idpf.epub-container'],
        },
        {
          CFBundleTypeName: 'PDF Document',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['com.adobe.pdf'],
        },
        {
          CFBundleTypeName: 'Mobipocket Book',
          LSHandlerRank: 'Alternate',
          LSItemContentTypes: ['com.amazon.mobi8-ebook', 'com.amazon.mobi-ebook'],
        },
      ],
      UTImportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'com.amazon.mobi-ebook',
          UTTypeDescription: 'Mobipocket Book',
          UTTypeConformsTo: ['public.data'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['mobi', 'prc'],
            'public.mime-type': ['application/x-mobipocket-ebook'],
          },
        },
      ],
    },
  },

  android: {
    package: 'dev.okf.reader',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      // "Open with okf-reader" from a file manager or a download.
      // The schemes are explicit: a book arrives as file:// or content://, and
      // without them the filter only matches the dev-client scheme Expo injects.
      {
        action: 'VIEW',
        category: ['DEFAULT', 'BROWSABLE'],
        data: BOOK_MIME_TYPES.flatMap((mimeType) => [
          { scheme: 'file', mimeType },
          { scheme: 'content', mimeType },
        ]),
      },
      // "Share to okf-reader" from any app holding a book.
      {
        action: 'SEND',
        category: ['DEFAULT'],
        data: BOOK_MIME_TYPES.map((mimeType) => ({ mimeType })),
      },
    ],
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    // The PDF renderer. blob-util is not imported by our code, but react-native-pdf
    // imports it unconditionally, so both need linking. The pdf plugin only adds the
    // Android `pickFirst libc++_shared.so` packaging rule that pdfium needs.
    '@config-plugins/react-native-blob-util',
    '@config-plugins/react-native-pdf',
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
