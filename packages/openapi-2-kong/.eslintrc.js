module.exports = /** @type { import('eslint').Linter.Config } */ {
  extends: '../../.eslintrc.js',
  rules: {
    camelcase: 'off',
    '@typescript-eslint/no-explicit-any': 'off', // TSCONVERSION
    '@typescript-eslint/no-empty-interface': 'off', // TSCONVERSION
  },
};
