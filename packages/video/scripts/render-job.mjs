import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const [propsPath, publicDir, outputPath] = process.argv.slice(2);
if (!propsPath || !publicDir || !outputPath) {
  throw new Error(
    "Render job requires props, public directory, and output paths.",
  );
}

const inputProps = JSON.parse(await readFile(resolve(propsPath), "utf8"));
const report = (progress) => {
  const bounded = Math.max(1, Math.min(99, Math.round(progress)));
  process.stdout.write(`MOTIONLY_PROGRESS:${bounded}\n`);
};

report(5);
const serveUrl = await bundle({
  entryPoint: resolve("src/register.ts"),
  publicDir: resolve(publicDir),
  onProgress: (progress) => report(5 + progress * 0.1),
});
try {
  report(15);
  const composition = await selectComposition({
    serveUrl,
    id: "MotionlyExplainer",
    inputProps,
    logLevel: "warn",
  });
  report(18);
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 20,
    concurrency: 2,
    inputProps,
    outputLocation: resolve(outputPath),
    overwrite: true,
    logLevel: "warn",
    onProgress: ({ progress }) => report(18 + progress * 80),
  });
  report(99);
} finally {
  await rm(serveUrl, { recursive: true, force: true }).catch(() => undefined);
}
