import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // react-pdf renders on the server inside route handlers.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Fonts and bundled images are read from disk when generating PDFs.
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./src/lib/pdf/fonts/**", "./public/exercises/**", "./public/foods/**", "./public/brand/**"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabaseHost && !supabaseHost.endsWith(".supabase.co") ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
