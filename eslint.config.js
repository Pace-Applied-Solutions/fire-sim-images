const { FlatCompat } = require('@eslint/eslintrc');
const { configs } = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: configs.recommended,
  allConfig: configs.all,
});

module.exports = [
  ...compat.config({
    extends: ['./.eslintrc.json'],
  }),
];
