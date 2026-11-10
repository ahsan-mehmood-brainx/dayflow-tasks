// FlashList measures its viewport natively; its official setup supplies fixed layouts for tests.
import '@shopify/flash-list/jestSetup';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

// Jest has no asset registry, so icon fonts can't be loaded. Report them as loaded so the real
// icon components render without attempting a download.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
