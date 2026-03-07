#!/usr/bin/env node
import fs from "fs";
import { loadConfig } from "./config";
import { readMarkdownFile } from "./frontmatter";
import { renderBjhHtml, renderWechatHtml } from "./markdown";
import { BjhClient } from "./bjhClient";
import { WechatClient } from "./wechatClient";

const parseArgs = (argv: string[]) => {
	const args: Record<string, string | boolean> = {};
	const positional: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg.startsWith("--")) {
			const [key, value] = arg.slice(2).split("=");
			if (value !== undefined) {
				args[key] = value;
			} else {
				const next = argv[i + 1];
				if (next && !next.startsWith("-")) {
					args[key] = next;
					i++;
				} else {
					args[key] = true;
				}
			}
		} else if (arg.startsWith("-")) {
			args[arg.slice(1)] = true;
		} else {
			positional.push(arg);
		}
	}
	return { args, positional };
};

const printHelp = () => {
	const help = `wechat-public-cli

Usage:
  wechat-public-cli <command> [--flags]

Commands:
  wechat:draft    Create a WeChat draft from a markdown file
  wechat:publish  Publish a WeChat draft (from media_id or markdown)
  wechat:sendall  Send to all WeChat followers (from media_id or markdown)
	wechat:download Download recent N WeChat articles to local files
  bjh:publish     Publish a Baijiahao article from markdown
  convert         Convert markdown to HTML

Flags:
  --file <path>         Path to markdown file
  --title <title>       Override article title
  --only-id <mediaId>   Override thumb_media_id for WeChat draft
  --media-id <mediaId>  Use existing media_id for WeChat publish/sendall
	--count <number>      Number of recent articles to download
	--out-dir <path>      Output folder for downloads
  --config <path>       Config file path
  --css <path>          Path to custom CSS file (default: custom.css or config path)
  --platform <wechat|bjh>  Convert output style (default: wechat)
  --out <path>          Write HTML to file (convert only)
  --help                Show help

Env:
  WECHAT_APPID, WECHAT_SECRET, WECHAT_ACCESS_TOKEN
  BJH_COOKIE, BJH_TOKEN, BJH_APP_ID
	WECHAT_CUSTOM_CSS, WECHAT_PUBLIC_CONFIG, WECHAT_DOWNLOAD_DIR
`;
	console.log(help);
};

const ensureFile = (filePath?: string) => {
	if (!filePath) {
		throw new Error("Missing --file");
	}
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`);
	}
};

const main = async () => {
	const { args, positional } = parseArgs(process.argv.slice(2));
	const command = positional[0];
	if (!command || args.help || args.h) {
		printHelp();
		return;
	}

	const configPath =
		typeof args.config === "string" ? args.config : undefined;
	const { config } = loadConfig(configPath);

	// CSS file priority: --css arg > config > default custom.css
	let customCssPath: string | undefined;
	if (typeof args.css === "string") {
		customCssPath = args.css;
	} else if (config.paths?.customCss) {
		customCssPath = config.paths.customCss;
	} else {
		// Try default custom.css in current directory
		const defaultCss = "custom.css";
		customCssPath = fs.existsSync(defaultCss) ? defaultCss : undefined;
	}

	const customCss =
		customCssPath && fs.existsSync(customCssPath)
			? fs.readFileSync(customCssPath, "utf-8")
			: "";

	if (command === "convert") {
		const filePath = typeof args.file === "string" ? args.file : undefined;
		ensureFile(filePath);
		const { content } = readMarkdownFile(filePath!);
		const platform =
			typeof args.platform === "string" ? args.platform : "wechat";
		const html =
			platform === "bjh"
				? await renderBjhHtml(content, customCss)
				: await renderWechatHtml(content, customCss);
		if (typeof args.out === "string") {
			fs.writeFileSync(args.out, html, "utf-8");
			console.log(`Wrote HTML to ${args.out}`);
		} else {
			console.log(html);
		}
		return;
	}

	if (command.startsWith("wechat")) {
		const client = new WechatClient(config.wechat ?? {});
		if (command === "wechat:download") {
			const rawCount =
				typeof args.count === "string" ? args.count : undefined;
			const count = rawCount ? Number(rawCount) : 5;
			const outDir =
				typeof args["out-dir"] === "string"
					? (args["out-dir"] as string)
					: (config.paths?.downloadDir ?? "wechat-downloads");
			await client.downloadRecentNews(count, outDir);
			console.log(`Downloaded ${count} articles to ${outDir}`);
			return;
		}
		if (command === "wechat:publish" || command === "wechat:sendall") {
			const mediaId =
				typeof args["media-id"] === "string"
					? (args["media-id"] as string)
					: undefined;
			if (mediaId) {
				if (command === "wechat:publish") {
					const publishId = await client.freePublish(mediaId);
					console.log(publishId);
					return;
				}
				const msgId = await client.sendAll(mediaId);
				console.log(msgId);
				return;
			}
		}

		const filePath = typeof args.file === "string" ? args.file : undefined;
		ensureFile(filePath);
		const { frontmatter, content, title } = readMarkdownFile(filePath!);
		const frontTitle =
			typeof frontmatter.title === "string"
				? frontmatter.title
				: undefined;
		const resolvedTitle =
			typeof args.title === "string" ? args.title : (frontTitle ?? title);
		const onlyId =
			typeof args["only-id"] === "string"
				? (args["only-id"] as string)
				: undefined;

		const mediaId = await client.createDraft({
			filePath: filePath!,
			content,
			title: resolvedTitle,
			frontmatter,
			onlyThumbMediaId: onlyId,
			customCss,
		});

		if (command === "wechat:draft") {
			console.log(mediaId);
			return;
		}
		if (command === "wechat:publish") {
			const publishId = await client.freePublish(mediaId);
			console.log(publishId);
			return;
		}
		if (command === "wechat:sendall") {
			const msgId = await client.sendAll(mediaId);
			console.log(msgId);
			return;
		}
	}

	if (command === "bjh:publish") {
		const filePath = typeof args.file === "string" ? args.file : undefined;
		ensureFile(filePath);
		const { frontmatter, content, title } = readMarkdownFile(filePath!);
		const frontTitle =
			typeof frontmatter.title === "string"
				? frontmatter.title
				: undefined;
		const resolvedTitle =
			typeof args.title === "string" ? args.title : (frontTitle ?? title);
		const client = new BjhClient(config.baidu ?? {});
		const mediaUrl = await client.publish({
			filePath: filePath!,
			content,
			title: resolvedTitle,
			frontmatter,
			customCss,
		});
		console.log(mediaUrl);
		return;
	}

	throw new Error(`Unknown command: ${command}`);
};

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
