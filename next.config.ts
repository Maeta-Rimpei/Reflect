import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** next.config と同じ階層 = リポジトリルート（cwd やツールによって親ディレクトリと誤認されるのを防ぐ） */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    // postcss が bare specifier `tailwindcss` を解決するときの起点ずれ対策
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules", "tailwindcss"),
    },
  },
};

export default nextConfig;
