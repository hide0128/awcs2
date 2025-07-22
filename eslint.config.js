import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  }
];