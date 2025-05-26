import eslint from '@eslint/js'
import eslintPluginImport from 'eslint-plugin-import'
import eslintConfigPrettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import love from 'eslint-config-love'
import eslintPluginSortKeysCustomOrder from 'eslint-plugin-sort-keys-custom-order'
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort'
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

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

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
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
		plugins: {
			import: eslintPluginImport,
			'simple-import-sort': eslintPluginSimpleImportSort,
			'unused-imports': eslintPluginUnusedImports,
		},
		rules: {
			complexity: 'off',
			'max-lines': 'off',
			'max-nested-callbacks': 'off',
			'@typescript-eslint/no-magic-numbers': 'off',
			'@typescript-eslint/prefer-destructuring': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/no-misused-spread': 'off',
			'no-var': 'error',
			'prefer-const': 'error',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'linebreak-style': ['error', 'unix'],
			'object-curly-spacing': ['error', 'always'],
			'no-multiple-empty-lines': ['warn', { max: 2 }],
			'prefer-destructuring': 'warn',
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
)
