import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['node_modules/**', 'ai/**'] },
  js.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
];
