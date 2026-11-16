import { defineConfig } from "astro/config";

// En CI, SITE_URL et BASE_PATH viennent de actions/configure-pages.
export default defineConfig({
  site: process.env.SITE_URL || "http://localhost:4321",
  base: process.env.BASE_PATH || "/",
  trailingSlash: "ignore",
});
