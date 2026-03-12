import fs from "fs";
import path from "path";
import * as mime from "mime-types";
import { chooseBoundary } from "../../utils/cookiesUtil";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { requestBinary, requestJson } from "./http";
import { renderWechatHtml } from "./markdown";
import { FrontmatterData } from "./types";

export type WechatDraftOptions = {
	filePath: string;
	content: string;
	title: string;
	frontmatter: FrontmatterData;
	onlyThumbMediaId?: string;
	customCss: string;
};

export type WechatClientConfig = {
	appid?: string;
	secret?: string;
	accessToken?: string;
};

export class WechatClient {
	private readonly baseWxUrl = "https://api.weixin.qq.com/cgi-bin";
	private accessToken?: string;
	private config: WechatClientConfig;

	constructor(config: WechatClientConfig) {
		this.config = config;
		this.accessToken = config.accessToken;
	}

	private getHeaders() {
		return {
			"Accept-Encoding": "gzip, deflate, br",
			"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
		};
	}

	private async refreshAccessToken(): Promise<string> {
		if (this.accessToken) {
			return this.accessToken;
		}
		if (!this.config.appid || !this.config.secret) {
			throw new Error("Missing wechat appid or secret");
		}
		const url = `${this.baseWxUrl}/token?grant_type=client_credential&appid=${this.config.appid}&secret=${this.config.secret}`;
		const resp = await requestJson({
			url,
			method: "GET",
			headers: this.getHeaders(),
		});
		const token = resp.json?.access_token as string | undefined;
		if (!token) {
			const errcode = resp.json?.errcode;
			const errmsg = resp.json?.errmsg;
			throw new Error(
				`Refresh access token failed: ${errcode} ${errmsg}`,
			);
		}
		this.accessToken = token;
		return token;
	}

	private async loadFileBytes(
		baseDir: string,
		filePath: string,
	): Promise<ArrayBuffer> {
		if (filePath.startsWith("http")) {
			const resp = await requestBinary({ url: filePath, method: "GET" });
			return resp.arrayBuffer;
		}
		const resolved = filePath.startsWith("./")
			? path.join(baseDir, filePath.slice(2))
			: path.resolve(baseDir, filePath);
		const data = fs.readFileSync(resolved);
		const copy = Uint8Array.from(data);
		return copy.buffer;
	}

	private async uploadMaterial(
		filePath: string,
		fileType: string,
		fileName: string,
	): Promise<string> {
		const accessToken = await this.refreshAccessToken();
		const buffer = await this.loadFileBytes("", filePath);
		const boundary = chooseBoundary();
		const endBoundary = `\r\n--${boundary}--\r\n`;
		let formDataString = "";
		formDataString += `--${boundary}\r\n`;

		const ext = this.getFileExtent(fileType);
		if (ext === "no") {
			throw new Error("Unsupported material type");
		}

		if (fileType === "video") {
			formDataString +=
				'Content-Disposition: form-data; name="description"\r\n\r\n';
			formDataString += `{\"title\":\"${fileName}\", \"introduction\":\"from obsidian wechat\"}\r\n`;
			formDataString += `--${boundary}\r\n`;
		}

		const contentType =
			mime.contentType(filePath) || "application/octet-stream";
		formDataString += `Content-Disposition: form-data; name=\"media\"; filename=\"${fileName}.${ext}\"\r\n`;
		formDataString += `Content-Type: ${contentType}\r\n\r\n`;

		const headerBuffer = Buffer.from(formDataString, "utf-8");
		const bodyArray = Array.from(headerBuffer);
		const fileArray = Array.from(new Uint8Array(buffer));
		const endBoundaryArray = Array.from(Buffer.from(endBoundary, "utf-8"));
		const postArray = bodyArray.concat(fileArray, endBoundaryArray);
		const postBuffer = new Uint8Array(postArray);

		const url = `${this.baseWxUrl}/material/add_material?access_token=${accessToken}&type=${fileType}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				Accept: "*/*",
				Connection: "keep-alive",
			},
			body: postBuffer,
		});

		const mediaId = resp.json?.media_id as string | undefined;
		if (!mediaId) {
			const errcode = resp.json?.errcode;
			const errmsg = resp.json?.errmsg;
			throw new Error(`Upload material failed: ${errcode} ${errmsg}`);
		}
		return mediaId;
	}

	private async uploadImageToWx(
		baseDir: string,
		imgPath: string,
		fileName: string,
	): Promise<string> {
		const accessToken = await this.refreshAccessToken();
		const buffer = await this.loadFileBytes(baseDir, imgPath);
		const boundary = chooseBoundary();
		const endBoundary = `\r\n--${boundary}--\r\n`;
		let formDataString = "";
		formDataString += `--${boundary}\r\n`;

		const contentType = mime.contentType(imgPath) || "image/png";
		formDataString += `Content-Disposition: form-data; name=\"media\"; filename=\"${fileName || "image"}.png\"\r\n`;
		formDataString += `Content-Type: ${contentType}\r\n\r\n`;

		const headerBuffer = Buffer.from(formDataString, "utf-8");
		const bodyArray = Array.from(headerBuffer);
		const fileArray = Array.from(new Uint8Array(buffer));
		const endBoundaryArray = Array.from(Buffer.from(endBoundary, "utf-8"));
		const postArray = bodyArray.concat(fileArray, endBoundaryArray);
		const postBuffer = new Uint8Array(postArray);

		const url = `${this.baseWxUrl}/media/uploadimg?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				Accept: "*/*",
				Connection: "keep-alive",
			},
			body: postBuffer,
		});

		const imageUrl = resp.json?.url as string | undefined;
		if (!imageUrl) {
			const errcode = resp.json?.errcode;
			const errmsg = resp.json?.errmsg;
			throw new Error(`Upload image failed: ${errcode} ${errmsg}`);
		}
		return imageUrl;
	}

	private async handleMarkdownImages(
		baseDir: string,
		content: string,
	): Promise<string> {
		const mdImageRegex = /!\[.*?\]\((.*?)\)/g;
		const matches = Array.from(content.matchAll(mdImageRegex));
		const replacements = await Promise.all(
			matches.map(async (match) => {
				const imagePath = match[1];
				const url = await this.uploadImageToWx(
					baseDir,
					imagePath,
					path.basename(imagePath),
				);
				return { match, url };
			}),
		);

		const wikiImageRegex = /!\[\[(.*?)\]\]/g;
		const wikiMatches = Array.from(content.matchAll(wikiImageRegex));
		const wikiReplacements = await Promise.all(
			wikiMatches.map(async (match) => {
				const imagePath = match[1];
				const resolved = path.join(baseDir, imagePath);
				const url = await this.uploadImageToWx(
					baseDir,
					resolved,
					path.basename(imagePath),
				);
				return { match, url };
			}),
		);

		let parsed = content;
		for (const { match, url } of replacements) {
			parsed = parsed.replace(match[0], `![image](${url})`);
		}
		for (const { match, url } of wikiReplacements) {
			parsed = parsed.replace(match[0], `![image](${url})`);
		}

		return parsed;
	}

	private getFileExtent(type: string): string {
		if (type === "image") {
			return "png";
		}
		if (type === "video") {
			return "mp4";
		}
		if (type === "voice") {
			return "webm";
		}
		if (type === "thumb") {
			return "jpg";
		}
		return "no";
	}

	private sanitizeFilename(input: string): string {
		return input.replace(/[\\/:*?"<>|]/g, "_").trim();
	}

	private buildFrontmatter(front: {
		author?: string;
		create_time?: string;
		update_time?: string;
		media_id?: string;
		url?: string;
		content_source_url?: string;
		thumb_media_id?: string;
		thumb_url?: string;
	}): string {
		const lines = [
			"---",
			`author: ${front.author ?? ""}`,
			`create_time: ${front.create_time ?? ""}`,
			`update_time: ${front.update_time ?? ""}`,
			`media_id: ${front.media_id ?? ""}`,
			`url: ${front.url ?? ""}`,
			`content_source_url: ${front.content_source_url ?? ""}`,
			`thumb_media_id: ${front.thumb_media_id ?? ""}`,
			`thumb_url: ${front.thumb_url ?? ""}`,
			"---",
		];
		return lines.join("\n");
	}

	private ensureUniquePath(outDir: string, baseName: string): string {
		let candidate = path.join(outDir, `${baseName}.md`);
		let index = 1;
		while (fs.existsSync(candidate)) {
			candidate = path.join(outDir, `${baseName}-${index}.md`);
			index += 1;
		}
		return candidate;
	}

	private async batchGetMaterial(
		type: string,
		offset: number,
		count: number,
	): Promise<any> {
		const accessToken = await this.refreshAccessToken();
		const url = `${this.baseWxUrl}/material/batchget_material?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ type, offset, count }),
		});
		const errcode = resp.json?.errcode as number | undefined;
		if (errcode && errcode !== 0) {
			throw new Error(
				`Batch get material failed: ${errcode} ${resp.json?.errmsg}`,
			);
		}
		return resp.json;
	}

	public async downloadRecentNews(
		count: number,
		outDir: string,
	): Promise<void> {
		if (!Number.isFinite(count) || count <= 0) {
			throw new Error("Count must be a positive number");
		}
		fs.mkdirSync(outDir, { recursive: true });
		const nhm = new NodeHtmlMarkdown();
		const collected: Array<{
			item: any;
			media_id: string;
			create_time: number;
			update_time: number;
		}> = [];
		let offset = 0;
		while (collected.length < count) {
			const batchSize = Math.min(20, count);
			const resp = await this.batchGetMaterial("news", offset, batchSize);
			const items = (resp.item ?? []) as any[];
			if (items.length === 0) {
				break;
			}
			for (const objItem of items) {
				const newsItems = objItem.content?.news_item ?? [];
				for (const item of newsItems) {
					collected.push({
						item,
						media_id: objItem.media_id,
						create_time: objItem.content?.create_time ?? 0,
						update_time:
							objItem.update_time ??
							objItem.content?.update_time ??
							0,
					});
				}
			}
			offset += items.length;
			if (items.length < batchSize) {
				break;
			}
		}

		collected.sort((a, b) => b.update_time - a.update_time);
		const sliced = collected.slice(0, count);
		for (const entry of sliced) {
			const item = entry.item;
			const created = entry.create_time
				? new Date(entry.create_time * 1000).toISOString()
				: "";
			const updated = entry.update_time
				? new Date(entry.update_time * 1000).toISOString()
				: "";
			const front = this.buildFrontmatter({
				author: item.author,
				create_time: created,
				update_time: updated,
				media_id: entry.media_id,
				url: item.url,
				content_source_url: item.content_source_url,
				thumb_media_id: item.thumb_media_id,
				thumb_url: item.thumb_url,
			});
			const contentMd = nhm.translate(item.content || "");
			const safeTitle = this.sanitizeFilename(item.title || "untitled");
			const filePath = this.ensureUniquePath(outDir, safeTitle);
			fs.writeFileSync(filePath, `${front}\n${contentMd}`, "utf-8");
		}
	}

	public async createDraft(options: WechatDraftOptions): Promise<string> {
		const accessToken = await this.refreshAccessToken();
		const { frontmatter } = options;
		let thumbMediaId = options.onlyThumbMediaId;

		if (!thumbMediaId) {
			const frontThumb = frontmatter["thumb_media_id"];
			const banner = frontmatter["banner"];
			const bannerPath = frontmatter["banner_path"];
			if (
				frontThumb &&
				typeof frontThumb === "string" &&
				frontThumb !== ""
			) {
				thumbMediaId = frontThumb;
			} else if (banner && typeof banner === "string" && banner !== "") {
				thumbMediaId = await this.uploadMaterial(
					banner,
					"image",
					`${options.title}_banner`,
				);
			} else if (
				bannerPath &&
				typeof bannerPath === "string" &&
				bannerPath !== ""
			) {
				const baseDir = path.dirname(options.filePath);
				const resolved = bannerPath.startsWith("http")
					? bannerPath
					: path.join(baseDir, bannerPath);
				thumbMediaId = await this.uploadMaterial(
					resolved,
					"image",
					`${options.title}_banner`,
				);
			}
		}

		if (!thumbMediaId) {
			throw new Error("Missing thumb_media_id or banner in frontmatter");
		}

		const author = (frontmatter["author"] as string) || "";
		const digest = (frontmatter["digest"] as string) || "";
		const contentSourceUrl = (frontmatter["source_url"] as string) || "";
		const needOpenComment = Number(frontmatter["open_comment"] ?? 0) || 0;

		const baseDir = path.dirname(options.filePath);
		const withImages = await this.handleMarkdownImages(
			baseDir,
			options.content,
		);
		const htmlText = await renderWechatHtml(withImages, options.customCss);

		const article = {
			title: options.title,
			author,
			digest,
			content: htmlText,
			content_source_url: contentSourceUrl,
			thumb_media_id: thumbMediaId,
			need_open_comment: needOpenComment,
			only_fans_can_comment: 0,
		};

		const url = `${this.baseWxUrl}/draft/add?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ articles: [article] }),
		});

		const mediaId = resp.json?.media_id as string | undefined;
		if (!mediaId) {
			const errcode = resp.json?.errcode;
			const errmsg = resp.json?.errmsg;
			throw new Error(`Create draft failed: ${errcode} ${errmsg}`);
		}
		return mediaId;
	}

	public async getUserCumulate(
		beginDate: string,
		endDate: string,
	): Promise<any> {
		const accessToken = await this.refreshAccessToken();
		const url = `https://api.weixin.qq.com/datacube/getusercumulate?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
		});
		if (resp.json?.errcode) {
			throw new Error(
				`getUserCumulate failed: ${resp.json.errcode} ${resp.json.errmsg}`,
			);
		}
		return resp.json;
	}

	public async getBizSummary(
		beginDate: string,
		endDate: string,
	): Promise<any> {
		const accessToken = await this.refreshAccessToken();
		const url = `https://api.weixin.qq.com/datacube/getbizsummary?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
		});
		if (resp.json?.errcode) {
			throw new Error(
				`getBizSummary failed: ${resp.json.errcode} ${resp.json.errmsg}`,
			);
		}
		return resp.json;
	}

	public async freePublish(mediaId: string): Promise<string> {
		const accessToken = await this.refreshAccessToken();
		const url = `${this.baseWxUrl}/freepublish/submit?access_token=${accessToken}`;
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ media_id: mediaId }),
		});
		const errcode = resp.json?.errcode as number | undefined;
		if (errcode && errcode !== 0) {
			throw new Error(
				`Free publish failed: ${errcode} ${resp.json?.errmsg}`,
			);
		}
		return resp.json?.publish_id as string;
	}

	public async sendAll(mediaId: string): Promise<string> {
		const accessToken = await this.refreshAccessToken();
		const url = `${this.baseWxUrl}/message/mass/sendall?access_token=${accessToken}`;
		const reqBody = {
			filter: { is_to_all: true },
			mpnews: { media_id: mediaId },
			msgtype: "mpnews",
			send_ignore_reprint: 0,
		};
		const resp = await requestJson({
			url,
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(reqBody),
		});
		const errcode = resp.json?.errcode as number | undefined;
		if (errcode && errcode !== 0) {
			throw new Error(`Send all failed: ${errcode} ${resp.json?.errmsg}`);
		}
		return resp.json?.msg_data_id as string;
	}
}
