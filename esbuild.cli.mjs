import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const context = await esbuild.context({
    entryPoints: ["src/cli/index.ts"],
    bundle: true,
    platform: "node",
    external: [...builtins],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: false,
    outfile: "dist/wechat-public-cli.js",
});

await context.rebuild();
process.exit(0);
