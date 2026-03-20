import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/lib/firestore-rules.test.ts", "src/lib/auth-bypass.test.ts"],
    testTimeout: 30000,
  },
})
