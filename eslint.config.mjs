import globals from 'globals'
import react from 'eslint-plugin-react'
import love from 'eslint-config-love'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginSortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order'

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
]

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
]
