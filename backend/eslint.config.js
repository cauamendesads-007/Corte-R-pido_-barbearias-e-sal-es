import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';

export default [
  { ignores: ['dist/', 'node_modules/', '*.config.*', 'tests/**', '**/*.test.ts'] },
  ...typescriptEslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
];