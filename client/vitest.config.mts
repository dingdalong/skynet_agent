import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const local = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@skynet/contracts": local("./packages/contracts/src/index.ts"),
            "@skynet/app-runtime": local("./packages/app-runtime/src/index.ts"),
            "@skynet/tokens": local("./packages/tokens/theme.ts"),
        },
    },
    test: { include: ["tooling/**/*.test.ts"] },
});
