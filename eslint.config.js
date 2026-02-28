export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'database/',
      'uploads/',
      '*.min.js',
      '*.log',
      '.env*',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.swp',
      '.vscode/',
      '.idea/'
    ]
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always']
    }
  }
];
