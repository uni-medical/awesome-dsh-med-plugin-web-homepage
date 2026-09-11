import { mkdir, copyFile } from "node:fs/promises";

const routes = ["marketplace", "collections", "research", "settings"];
for (const route of routes) {
  await mkdir(`dist/${route}`, { recursive: true });
  await copyFile("dist/index.html", `dist/${route}/index.html`);
}
await copyFile("dist/index.html", "dist/404.html");
