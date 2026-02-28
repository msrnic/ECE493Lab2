module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js'],
  rules: {
    eqeqeq: ['error', 'always'],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
