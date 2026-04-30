// Astro and external packages
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import { transformerNotationHighlight } from "@shikijs/transformers";
import tailwindcss from "@tailwindcss/vite";

// Node.js built-in modules
import path from "path";
import { fileURLToPath } from "url";

// Local imports (./src/utils)
import { SITE } from "./src/utils/config.ts";
import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin } from "./src/utils/frontmatter.mjs";
import tasks from "./src/utils/tasks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: SITE.site,
  base: SITE.base,
  trailingSlash: SITE.trailingSlash ? "always" : "never",

  output: "static",

  integrations: [
    sitemap({
      filter: (page) => !page.includes("ldr"),
    }),
    mdx(),
    icon({
      include: {
        tabler: ["*"],
      },
    }),
    tasks(),
    react(),
    pagefind(),
  ],

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [responsiveTablesRehypePlugin],
    shikiConfig: {
      transformers: [
        transformerNotationHighlight({
          matchAlgorithm: "v3",
        }),
      ],
    },
  },

  redirects: {
    "/resume": "/resume/acting",
    "/web": "/resume/web",
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  },
});
