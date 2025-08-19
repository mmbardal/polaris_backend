import paratcoEslintConfig from "@paratco/eslint-config";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  ...paratcoEslintConfig.node,
  ...paratcoEslintConfig.stylisticFormatter,
  ...paratcoEslintConfig.import,
  {
    files: ["src/domain/**/*.{js,ts}"], // Specify the directory and file types
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off"
    },
  },
  // TypeScript Rules
  {
    files: ["**/*.{ts,tsx,js}"],
    rules: {
      "no-console": "warn",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Dont import from presentations
            {
              from: "./src/presentation/",
              target: "./src/domain/",
              message: "Dont import from presentation."
            }
          ]
        }
      ]
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2025,
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
  },

  {
    ignores: [
      "src/data/models.ts",
      "dist",
      "lints",
      "eslint.config.js",
      "*.html",
      "rollup.config.js",
      "**/__mocks__/*", // devDependency error
      "**/migrations/*.ts",
      "**/tests/*"
    ]
  }
);
