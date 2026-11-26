import { mkdir, copyFile } from "node:fs/promises";

// Static entry points for client-side routes on GitHub Pages.
// "collections" and "research" redirect to the component ecosystem.
const routes = ["marketplace", "graph", "settings", "collections", "research"];
for (const route of routes) {
  await mkdir(`dist/${route}`, { recursive: true });
  await copyFile("dist/index.html", `dist/${route}/index.html`);
}
await copyFile("dist/index.html", "dist/404.html");
