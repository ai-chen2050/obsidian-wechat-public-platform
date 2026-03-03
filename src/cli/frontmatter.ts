import fs from "fs";
import path from "path";
import { FrontmatterData } from "./types";

const FRONTMATTER_BOUNDARY = "---";

const stripInlineComment = (raw: string): string => {
	let inSingle = false;
	let inDouble = false;
	for (let i = 0; i < raw.length; i++) {
		const ch = raw[i];
		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			continue;
		}
		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			continue;
		}
		if (ch === "#" && !inSingle && !inDouble) {
			return raw.slice(0, i).trim();
		}
	}
	return raw.trim();
};

const parseValue = (raw: string): string | number | boolean => {
	const trimmed = stripInlineComment(raw).trim();
	if (trimmed === "true") {
		return true;
	}
	if (trimmed === "false") {
		return false;
	}
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
		return Number(trimmed);
	}
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
};

const parseFrontmatterBlock = (block: string): FrontmatterData => {
	const data: FrontmatterData = {};
	const lines = block.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("#")) {
			continue;
		}
		const idx = trimmed.indexOf(":");
		if (idx === -1) {
			continue;
		}
		const key = trimmed.slice(0, idx).trim();
		const value = trimmed.slice(idx + 1);
		data[key] = parseValue(value);
	}
	return data;
};

export const readMarkdownFile = (
	filePath: string,
): { frontmatter: FrontmatterData; content: string; title: string } => {
	const raw = fs.readFileSync(filePath, "utf-8");
	let frontmatter: FrontmatterData = {};
	let content = raw;

	if (raw.startsWith(FRONTMATTER_BOUNDARY)) {
		const endIndex = raw.indexOf(
			FRONTMATTER_BOUNDARY,
			FRONTMATTER_BOUNDARY.length,
		);
		if (endIndex !== -1) {
			const block = raw
				.slice(FRONTMATTER_BOUNDARY.length, endIndex)
				.trim();
			frontmatter = parseFrontmatterBlock(block);
			content = raw
				.slice(endIndex + FRONTMATTER_BOUNDARY.length)
				.replace(/^\s+/, "");
		}
	}

	const title = path.basename(filePath, path.extname(filePath));
	return { frontmatter, content, title };
};
