import typescriptParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import eslintConfigPrettier from 'eslint-config-prettier'
import sonarjs from 'eslint-plugin-sonarjs'

export default [
  {
    ignores: ['.cache/', '.git/', '.github/', 'node_modules/', '.react-router/', 'vite-env.d.ts'],
  },
  {
    files: ['**/*.{js,ts,jsx,tsx,cjs,cts,mjs,mts,html,vue}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript: https://typescript-eslint.io/rules/
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.stylistic.rules,
      '@typescript-eslint/triple-slash-reference': 'warn',
      '@typescript-eslint/member-ordering': 'error',

      // EcmaScript: https://eslint.org/docs/latest/rules/
      'prefer-template': 'error',

      // Prettier: https://github.com/prettier/eslint-config-prettier?tab=readme-ov-file#special-rules
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'warn',
    },
  },
  // Unicorn: https://github.com/sindresorhus/eslint-plugin-unicorn
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            doc: {
              document: false,
            },
          },
        },
      ],
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/no-null': 'off',
    },
  },
  // SonarJS: https://github.com/SonarSource/SonarJS/blob/master/packages/jsts/src/rules/README.md
  sonarjs.configs.recommended,
  {
    rules: {
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/no-duplicate-string': 'error',
    },
  },
  // React
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  // Prettier
  eslintPluginPrettierRecommended,
]
