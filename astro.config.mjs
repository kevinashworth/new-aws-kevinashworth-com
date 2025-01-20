// Astro and external packages
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import { transformerNotationHighlight } from "@shikijs/transformers";

// Node.js built-in modules
import path from "path";
import { fileURLToPath } from "url";

// Local imports (./src/utils)
import { ANALYTICS, SITE } from "./src/utils/config.ts";
import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin } from "./src/utils/frontmatter.mjs";
import tasks from "./src/utils/tasks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const whenExternalScripts = (items = []) =>
  ANALYTICS.vendors.googleAnalytics.id && ANALYTICS.vendors.googleAnalytics.partytown
    ? Array.isArray(items)
      ? items.map((item) => item())
      : [items()]
    : [];

export default defineConfig({
  site: SITE.site,
  base: SITE.base,
  trailingSlash: SITE.trailingSlash ? "always" : "never",

  output: "static",

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => !page.includes("ldr"),
    }),
    mdx(),
    icon({
      include: {
        tabler: ["*"],
      },
    }),
    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ["dataLayer.push"] },
      }),
    ),
    tasks(),
    react(),
    pagefind(),
  ],

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [responsiveTablesRehypePlugin],
    shikiConfig: {
      transformers: [transformerNotationHighlight()],
    },
  },

  vite: {
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  },
});
