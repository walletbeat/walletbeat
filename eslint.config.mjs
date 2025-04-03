import globals from 'globals';
import react from 'eslint-plugin-react';
import love from 'eslint-config-love';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  love,
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
    rules: {
      complexity: 'off',
      'max-lines': 'off',
      'max-nested-callbacks': 'off',
			'@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/prefer-destructuring': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
    },
  },
  eslintConfigPrettier,
];
