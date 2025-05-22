import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginSortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order';
import globals from 'globals';
import eslintPluginPrettier from 'eslint-plugin-prettier';

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
	eslint.configs.recommended,
	tseslint.configs.recommended,
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
			'no-unused-vars': 'off',
			'no-redeclare': 'off',
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
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
			'prettier/prettier': 'error',
		},
	}
);
