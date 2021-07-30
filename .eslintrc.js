module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-var": "error",
    "no-unused-vars": "warn",
    "prefer-const": "warn"
  },
  "globals": {
    "logger": "writable",
    "name": "writable"
  }
};
