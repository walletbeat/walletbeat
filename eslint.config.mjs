import eslint from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginSortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import eslintPluginEslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Note: If you want to use eslint-comments rules, you need to install and import eslint-plugin-eslint-comments

const firstOrderedKeys = [
  'id',
  'name',
  'displayName',
  'legalName',
  'tableName',
  'friendlyName',
  'formalTitle',
  'type',
  'metadata',
];

export default tseslint.config(
  // Ignore generated files
  {
    ignores: ['src/generated/**'],
  },
  eslintPluginEslintComments.recommended,
  eslint.configs.recommended,
  process.env.WALLETBEAT_PRECOMMIT_FAST === 'true'
    ? tseslint.configs.recommended
    : tseslint.configs.recommendedTypeChecked,
  process.env.WALLETBEAT_PRECOMMIT_FAST === 'true'
    ? {}
    : {
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
      },
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      import: eslintPluginImport,
      'simple-import-sort': eslintPluginSimpleImportSort,
      'unused-imports': eslintPluginUnusedImports,
    },
    rules: {
      // React rules
      'react/display-name': 'off',
      'prefer-destructuring': 'off',

      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // indent: ['error', { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, { SwitchCase: 1 }, 2],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'linebreak-style': ['error', 'unix'],
      'object-curly-spacing': ['error', 'always'],
      'no-multiple-empty-lines': ['warn', { max: 2 }],
      // 'prefer-destructuring': 'warn',
      'prefer-arrow-callback': 'warn',

      // 'no-duplicate-imports': ['error', { includeExports: true }],
      'import/no-duplicates': 'error',

      // Import sorting and cleanup
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // TypeScript rules
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Padding lines for readability
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: ['return', 'if', 'switch', 'try', 'for'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'switch', 'try', 'const', 'let'],
          next: '*',
        },
        {
          blankLine: 'any',
          prev: ['const', 'let'],
          next: ['const', 'let'],
        },
      ],

      // Slow vs fast rules.
      ...(process.env.WALLETBEAT_PRECOMMIT_FAST === 'true'
        ? {
            // Disable eslint-disable checks, as they may be referring to
            // checks that are only enforced in slow mode.
            '@eslint-community/eslint-comments/no-unlimited-disable': 'off',
            '@eslint-community/eslint-comments/no-unused-disable': 'off',
          }
        : {
            '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
            '@eslint-community/eslint-comments/no-unused-disable': 'error',
            '@typescript-eslint/no-unsafe-type-assertion': 'error',
          }),
    },
  },
  {
    plugins: { 'simple-import-sort': eslintPluginSimpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['data/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    plugins: { 'sort-keys-custom-order': eslintPluginSortKeysCustomOrder },
    rules: {
      'sort-keys-custom-order/object-keys': [
        'error',
        {
          orderedKeys: firstOrderedKeys,
          sorting: 'asc',
        },
      ],
      'sort-keys-custom-order/type-keys': [
        'error',
        {
          orderedKeys: firstOrderedKeys,
          sorting: 'asc',
        },
      ],
    },
  },
  {
    plugins: { prettier: eslintPluginPrettier },
    rules: {
      'prettier/prettier': ['error', { singleQuote: true, useTabs: true, semi: false }],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
);
