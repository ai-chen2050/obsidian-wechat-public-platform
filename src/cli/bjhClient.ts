import fs from "fs";
import path from "path";
import * as mime from "mime-types";
import {
	chooseBoundary,
	isWebp,
	jsonToUrlEncoded,
} from "../../utils/cookiesUtil";
import { requestBinary, requestJson } from "./http";
import { renderBjhHtml } from "./markdown";
import { FrontmatterData } from "./types";

export type BjhClientConfig = {
	cookie?: string;
	token?: string;
	appId?: string;
};

export type BjhPublishOptions = {
	filePath: string;
	content: string;
	title: string;
	frontmatter: FrontmatterData;
	customCss: string;
};

export class BjhClient {
	private config: BjhClientConfig;

	constructor(config: BjhClientConfig) {
		this.config = config;
	}

	private getHeaders() {
		return {
			accept: "application/json, text/plain, */*",
			"accept-language": "zh-CN,zh;q=0.9",
			"cache-control": "no-cache",
			pragma: "no-cache",
		};
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

	private async uploadImage(
		baseDir: string,
		imgPath: string,
		fileName: string,
	): Promise<string> {
		if (!this.config.cookie || !this.config.token || !this.config.appId) {
			throw new Error("Missing Baidu cookie/token/appId");
		}
		const buffer = await this.loadFileBytes(baseDir, imgPath);
		const boundary = chooseBoundary();
		const endBoundary = `\r\n--${boundary}--\r\n`;
		let formDataString = "";
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="type"\r\n\r\nimage\r\n';
		formDataString += `--${boundary}\r\n`;
		formDataString += `Content-Disposition: form-data; name=\"app_id\"\r\n\r\n${this.config.appId}\r\n`;
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="is_waterlog"\r\n\r\n1\r\n';
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="save_material"\r\n\r\n1\r\n';
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="no_compress"\r\n\r\n0\r\n';
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="is_events"\r\n\r\n\r\n';
		formDataString += `--${boundary}\r\n`;
		formDataString +=
			'Content-Disposition: form-data; name="article_type"\r\n\r\nnews\r\n';
		formDataString += `--${boundary}\r\n`;

		let contentType = mime.contentType(imgPath) || "image/png";
		if (
			contentType !== "image/jpeg" &&
			contentType !== "image/png" &&
			contentType !== "image/jpg"
		) {
			contentType = "image/png";
		}
		formDataString += `Content-Disposition: form-data; name=\"media\"; filename=\"${fileName || "image"}.png\"\r\n`;
		formDataString += `Content-Type: ${contentType}\r\n\r\n`;

		const headerBuffer = Buffer.from(formDataString, "utf-8");
		let fileArray = Array.from(new Uint8Array(buffer));
		if (isWebp(new Uint8Array(buffer))) {
			const fallback = await requestBinary({
				url: "https://mmbiz.qpic.cn/mmbiz_jpg/avKRXZvpU06jcDsZoj2IPxLtG08lfq3hvVUianAGoxyc5d3hpsic3CPoRTeiaNBvqr0LaSHcES0x1k1cvwxUVSoxA/0?wx_fmt=jpeg",
				method: "GET",
			});
			fileArray = Array.from(new Uint8Array(fallback.arrayBuffer));
		}

		const bodyArray = Array.from(headerBuffer);
		const endBoundaryArray = Array.from(Buffer.from(endBoundary, "utf-8"));
		const postArray = bodyArray.concat(fileArray, endBoundaryArray);
		const postBuffer = new Uint8Array(postArray);

		const url = "https://baijiahao.baidu.com/pcui/picture/uploadproxy";
		const resp = await requestJson({
			url,
			method: "POST",
			headers: {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				Accept: "*/*",
				Connection: "keep-alive",
				Referer:
					"https://baijiahao.baidu.com/builder/rc/edit?type=news",
				token: this.config.token,
				Cookie: this.config.cookie,
			},
			body: postBuffer,
		});

		const errcode = resp.json?.errno as number | undefined;
		if (errcode !== 0) {
			const errmsg = resp.json?.errmsg;
			throw new Error(`Upload image failed: ${errcode} ${errmsg}`);
		}
		const imageUrl = resp.json?.ret?.https_url as string | undefined;
		if (!imageUrl) {
			throw new Error("Upload image failed: missing image url");
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
				const url = await this.uploadImage(
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
				const url = await this.uploadImage(
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

	public async publish(options: BjhPublishOptions): Promise<string> {
		if (!this.config.cookie || !this.config.token || !this.config.appId) {
			throw new Error("Missing Baidu cookie/token/appId");
		}
		const frontmatter = options.frontmatter;
		const baseDir = path.dirname(options.filePath);
		const banner = frontmatter["banner"] as string | undefined;
		const bannerPath = frontmatter["banner_path"] as string | undefined;
		let coverUrl: string | undefined;
		if (banner) {
			coverUrl = await this.uploadImage(
				baseDir,
				banner,
				`${options.title}_banner`,
			);
		} else if (bannerPath) {
			const resolved = bannerPath.startsWith("http")
				? bannerPath
				: path.join(baseDir, bannerPath);
			coverUrl = await this.uploadImage(
				baseDir,
				resolved,
				`${options.title}_banner`,
			);
		}

		if (!coverUrl) {
			throw new Error("Missing banner or banner_path in frontmatter");
		}

		const author = (frontmatter["author"] as string) || "";
		const digest = (frontmatter["digest"] as string) || "";
		const withImages = await this.handleMarkdownImages(
			baseDir,
			options.content,
		);
		const htmlText = await renderBjhHtml(withImages, options.customCss);
		const htmlWithCover = `${htmlText}<img src=\"${coverUrl}\"><br>`;

		const coverImages = [
			{
				src: coverUrl,
				cropData: { x: 0, y: 0, width: 2048, height: 1365 },
				machine_chooseimg: 0,
				isLegal: 1,
			},
		];
		const coverImagesMap = [{ src: coverUrl }];
		const reqBody = {
			type: "news",
			title: options.title,
			author,
			abstract: digest,
			content: htmlWithCover,
			auto_mount_goods: "1",
			len: htmlWithCover.length.toString(),
			vertical_cover: coverUrl,
			cover_images: JSON.stringify(coverImages),
			_cover_images_map: JSON.stringify(coverImagesMap),
		};
		const activityList =
			"&activity_list%5B0%5D%5Bid%5D=408&activity_list%5B0%5D%5Bis_checked%5D=0&activity_list%5B1%5D%5Bid%5D=ttv&activity_list%5B1%5D%5Bis_checked%5D=1&activity_list%5B2%5D%5Bid%5D=reward&activity_list%5B2%5D%5Bis_checked%5D=1&activity_list%5B3%5D%5Bid%5D=aigc_bjh_status&activity_list%5B3%5D%5Bis_checked%5D=0&source_reprinted_allow=0&abstract_from=2&isBeautify=false&usingImgFilter=false&cover_layout=one";
		const postStr =
			"&source=upload&cover_source=upload&subtitle=&bjhtopic_id=&bjhtopic_info=&clue=1&bjhmt=&order_id=&aigc_rebuild=&image_edit_point=%5B%7B%22img_type%22%3A%22cover%22%2C%22img_num%22%3A%7B%22template%22%3A0%2C%22font%22%3A0%2C%22filter%22%3A0%2C%22paster%22%3A0%2C%22cut%22%3A0%2C%22any%22%3A0%7D%7D%2C%7B%22img_type%22%3A%22body%22%2C%22img_num%22%3A%7B%22template%22%3A0%2C%22font%22%3A0%2C%22filter%22%3A0%2C%22paster%22%3A0%2C%22cut%22%3A0%2C%22any%22%3A0%7D%7D%5D";
		const bodyContent = jsonToUrlEncoded(reqBody) + activityList + postStr;

		const url =
			"https://baijiahao.baidu.com/pcui/article/publish?callback=bjhpublish";
		const resp = await requestJson({
			url,
			method: "POST",
			headers: {
				...this.getHeaders(),
				"content-type": "application/x-www-form-urlencoded",
				Referer:
					"https://baijiahao.baidu.com/builder/rc/edit?type=news",
				token: this.config.token,
				Cookie: this.config.cookie,
			},
			body: bodyContent,
		});

		const errcode = resp.json?.errno as number | undefined;
		if (errcode !== 0) {
			const errmsg = resp.json?.errmsg;
			throw new Error(`Publish failed: ${errcode} ${errmsg}`);
		}
		const mediaUrl = resp.json?.ret?.url as string | undefined;
		if (!mediaUrl) {
			throw new Error("Publish failed: missing url");
		}
		return mediaUrl;
	}
}
