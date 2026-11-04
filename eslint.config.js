// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'coverage/*']),
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/no-cycle': 'error',
    },
  },
  // Architectural boundaries. These encode the layering described in the README
  // so violations fail lint instead of relying on review.
  {
    files: ['src/features/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-native', 'react-redux', '@reduxjs/toolkit', '@/core/*', '@/shared/api/*', '**/data/*', '**/state/*', '**/presentation/*'],
              message: 'The domain layer must stay framework-free and must not depend on outer layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/*/presentation/**/*.{ts,tsx}', 'src/shared/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/*', '@/shared/api/*'],
              message: 'Presentation must not reach data-layer implementations. Dispatch thunks from the feature state layer instead.',
            },
          ],
        },
      ],
    },
  },
]);
