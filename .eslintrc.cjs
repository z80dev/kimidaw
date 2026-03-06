module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    worker: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Strict TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    
    // AudioWorklet realtime safety
    'no-restricted-syntax': [
      'error',
      {
        selector: 'NewExpression[callee.name="Array"][arguments.length=1]',
        message: 'No dynamic array allocation in AudioWorklet processors',
      },
      {
        selector: 'NewExpression[callee.name="Object"]',
        message: 'No dynamic object creation in hot paths',
      },
    ],
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    // Relax rules for tests
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    // Workers have different globals
    {
      files: ['**/*.worker.ts', '**/worklets/*.ts'],
      env: {
        serviceworker: true,
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
