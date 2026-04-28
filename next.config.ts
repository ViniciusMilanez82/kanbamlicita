import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz para o diretório atual — evita o warning de múltiplos lockfiles
  // quando o projeto é aberto a partir de um worktree dentro de outro repo.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
