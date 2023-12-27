import { Notice, requestUrl, request, RequestUrlParam, Platform, FrontMatterCache, TFile, App, Vault, stringifyYaml } from 'obsidian';
import { settingsStore } from './settings';
import { get } from 'svelte/store';
import {marked} from 'marked'
import { basicStyle } from './style/basicStyle';
import {wechatFormat} from './style/wechatFormat';
import {codeStyle} from './style/codeStyle';
import juice from "juice";
import * as mime from 'mime-types';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown'

import { ArticleElement, Articles, BatchGetMaterial, CoverInfo, MDFrontMatterContent, MediaItem, NewsItem } from './models';
import { chooseBoundary } from 'utils/cookiesUtil';

export default class ApiManager {
	app: App;

	constructor(app: App) {
        this.app = app;
    }

	readonly baseUrl: string = 'https://api.weixin.qq.com/cgi-bin';
    readonly expireDuration : number = 7200 * 1000;   // millisecond

	private getHeaders() {
		return {
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
		};
	}

	public blobToDataBytes(blob: Blob): Promise<ArrayBuffer> {
		return new Promise<ArrayBuffer>((resolve, reject) => {
		  const fileReader = new FileReader();
		  fileReader.onload = () => {
			const picBuffer = fileReader.result as ArrayBuffer;
			resolve(picBuffer);
		  };
		  fileReader.onerror = reject;
		  fileReader.readAsArrayBuffer(blob);
		});
	}

	public solveHTML(html: string): string {
		html = html.replace(/<mjx-container (class="inline.+?)<\/mjx-container>/g, "<span $1</span>");
		html = html.replace(/\s<span class="inline/g, '&nbsp;<span class="inline');
		html = html.replace(/svg><\/span>\s/g, "svg></span>&nbsp;");
		html = html.replace(/mjx-container/g, "section");
		html = html.replace(/class="mjx-solid"/g, 'fill="none" stroke-width="70"');
		html = html.replace(/<mjx-assistive-mml.+?<\/mjx-assistive-mml>/g, "");
		let res = "";
		try {
			res = juice.inlineContent(html, basicStyle + wechatFormat + codeStyle + "", {
				inlinePseudoElements: true,
				preserveImportant: true,
			});
		} catch (e) {
			new Notice("请检查 CSS 文件是否编写正确！");
		}

		return res;
	}

	public async refreshAccessToken(appid: string, secret: string) : Promise<Boolean> {
        if(appid === '' || secret === '') {
            new Notice('Please input correct [appid] and [secret]');
            return false;
        }

        if ((get(settingsStore).lastAccessKeyTime + this.expireDuration) <  new Date().getTime()) {
            const url = `${this.baseUrl}/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
            const req: RequestUrlParam = {
                url: url,
                method: 'GET',
                headers: this.getHeaders()
            };
            const resp = await requestUrl(req);
            const respAccessToken: string = resp.json["access_token"];
            if (respAccessToken === undefined) {
                const errcode = resp.json["errcode"];
                const errmsg = resp.json["errmsg"];
                console.log(errmsg);
                new Notice(`尝试刷新AccessToken失败, errorCode: ${errcode}, errmsg: ${errmsg}`);
				return false;
            } else {
                new Notice('刷新 AccessToken 成功');
                settingsStore.actions.setAccessToken(respAccessToken);
            }
        }
		return true;
	}
    
	async uploadMaterial(path: string, fileType: string, fileName: string): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}
			
			var blobBytes: ArrayBuffer | null = null;
			if (path.startsWith("http")) {
				const imgresp = await requestUrl(path);
				blobBytes = imgresp.arrayBuffer
			} else {
				const imgfile = this.app.vault.getAbstractFileByPath(path);
				if (imgfile instanceof TFile) {
					const data = await this.app.vault.readBinary(imgfile);
					blobBytes = data
				} else {
					new Notice('Please input correct file relative path in obsidian');
					return
				}				
			}

			const boundary = chooseBoundary()
			const end_boundary = '\r\n--' + boundary + '--\r\n';
			let formDataString = '';
			formDataString += '--' + boundary + '\r\n';
			const exts = this.getFileExtent(fileType)
			if (exts === "no") {
				new Notice('Not Support, Only supplied type image,video,voice,thumb');
				return
			}
			if (fileType === "video") {
				formDataString += `Content-Disposition: form-data; name="description"` + '\r\n\r\n';
				formDataString += `\{"title":\"${fileName}\", "introduction":"from ob wechat"\}` + '\r\n';
				formDataString += '--' + boundary + '\r\n';
			}
			
			const contentType = mime.contentType(path);
			formDataString += `Content-Disposition: form-data; name="media"; filename=\"${fileName}.${exts}\"` + '\r\n';
			formDataString += `Content-Type: ${contentType}` + '\r\n\r\n';

			const formDatabuffer = Buffer.from(formDataString, 'utf-8');	// utf8 encode, for chinese
			var resultArray = Array.from(formDatabuffer);
			// console.log(formDataString);
			// return
			if (blobBytes !== null) {
				var pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
				var endBoundaryArray = [];
				for (var i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
					endBoundaryArray.push(end_boundary.charCodeAt(i));
				}
				var postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray); // 合并文本、图片数据得到最终要发送的数据
				var post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
				// console.log(post_typedArray)

				const url = `${this.baseUrl}/material/add_material?access_token=${setings.accessToken}&type=${fileType}`;
				const header = {
					'Content-Type': 'multipart/form-data; boundary=' + boundary,
					'Accept-Encoding': 'gzip, deflate, br',
					'Accept': '*/*', 
					'Connection': 'keep-alive',
				}; 

				const req: RequestUrlParam = {
					url: url,
					method: 'POST',
					headers: header,
					body: post_typedArray.buffer,
				};
				const resp = await requestUrl(req);
				const media_id = resp.json["media_id"];
				if (media_id === undefined) {
					const errcode = resp.json["errcode"];
					const errmsg = resp.json["errmsg"];
					console.log(errmsg);
					new Notice(`uploadMaterial, errorCode: ${errcode}, errmsg: ${errmsg}`);
					return
				}
				new Notice(`Success Upload Material media_id ${media_id}.`);
				return media_id
			} else {
				throw new Error('resrouce is empty,blobBytes, Failed to upload Material');
			}
		} catch (e) {
			new Notice(
				'Failed to upload Material'
			);
			console.error('upload Material error' + e);
		}
	}

	async newDraft(title: string, content: string, frontmatter: FrontMatterCache, only_id: string = ""): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}

			const MdImagedContent = await this.handleMDImage(content)
			const htmlText = await marked.parse(MdImagedContent)
			const htmlText2 = this.solveHTML(`<section id="nice">` + htmlText +`</section>`)
			// console.log(htmlText2);
			// return
			var thumb_media_id : string | undefined = ""
			if (only_id === "") {
				if( frontmatter["thumb_media_id"] !== undefined && frontmatter["thumb_media_id"] !== ""){
					thumb_media_id = frontmatter["thumb_media_id"]
				} else {
					if( frontmatter["banner"] !== undefined && frontmatter["banner"] !== ""){
						thumb_media_id = await this.uploadMaterial(frontmatter["banner"], "image", title+"_banner");
					} else if( frontmatter["banner_path"] !== undefined && frontmatter["banner_path"] !== ""){
						thumb_media_id = await this.uploadMaterial(frontmatter["banner_path"], "image", title+"_banner");
					}
				}
			} else {
				thumb_media_id = only_id;
			}

			if (thumb_media_id === "" && frontmatter["banner"] === undefined && frontmatter["banner_path"] === undefined) {
				new Notice('Please set banner of article, thumb_media_id, banner, banner_path in file frontManager');
				return
			}

			const url = `${this.baseUrl}/draft/add?access_token=${setings.accessToken}`;
            const article: ArticleElement = {
                title: title,
                author: frontmatter["author"],
                digest: frontmatter["digest"],
                content: htmlText2.replace(/[\r\n]/g, ""),
                content_source_url: frontmatter["source_url"],
                thumb_media_id: thumb_media_id!,
                need_open_comment: frontmatter["open_comment"],
                only_fans_can_comment: 0,
            };
			const articles: Articles = {
				articles: [article]
			};
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(articles)
			};
			const resp = await requestUrl(req);
			const media_id = resp.json["media_id"];
			if (media_id === undefined) {
				const errcode = resp.json["errcode"];
				const errmsg = resp.json["errmsg"];
				console.log(errmsg);
				new Notice(`newDraft, errorCode: ${errcode}, errmsg: ${errmsg}`);
				return
			}
			new Notice(`Success New draft media_id ${media_id}.`);
			return media_id
		} catch (e) {
			new Notice(
				'Failed to new wechat public draft. Please check your appId, secret and try again.'
			);
			console.error('new wechat public draft error' + e);
		}
	}

	async freepublish(media_id: string): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}

			const url = `${this.baseUrl}/freepublish/submit?access_token=${setings.accessToken}`;
            const reqBody = {
                "media_id": media_id
            };
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(reqBody)
			};
			const resp = await requestUrl(req);
            const errorcode = resp.json["errcode"]
            if ( errorcode !== 0 && errorcode !== undefined) {
                new Notice(`Failed to free publish. errcode ${errorcode},` + resp.json["errmsg"]);
				return
            }
			new Notice(`Success Release publish_id ${resp.json["publish_id"]}.`);
			return resp.json["publish_id"];
		} catch (e) {
			new Notice(
				'Failed to free publish. Please check your appId, secret and try again.'
			);
			console.error('free publish error' + e);
		}
	}

	// group send push article to fees
	async sendAll(media_id: string): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}

			const url = `${this.baseUrl}/message/mass/sendall?access_token=${setings.accessToken}`;
            const reqBody = {
				"filter":{
				   "is_to_all":true,
				//    "tag_id":2
				},
				"mpnews":{
				   "media_id": media_id,
				},
				 "msgtype":"mpnews",
				 "send_ignore_reprint":0
			 };
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(reqBody)
			};
			const resp = await requestUrl(req);
            const errorcode = resp.json["errcode"]
            if ( errorcode !== 0 && errorcode !== undefined) {
                new Notice(`Failed to sending all fees. errcode ${errorcode},` + resp.json["errmsg"]);
				return
            }
			new Notice(`Success Release msg_data_id ${resp.json["msg_data_id"]}.`);
			return resp.json["msg_data_id"];
		} catch (e) {
			new Notice(
				'Failed to sending all fees. Please check your appId, secret and try again.'
			);
			console.error('send all fees error' + e);
		}
	}

	async batchGetMaterial(type: string, offset: number, count: number) {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false || isNaN(offset) || isNaN(count)) {
				return
			}

			const url = `${this.baseUrl}/material/batchget_material?access_token=${setings.accessToken}`;
            const reqBody = {
				"type": type,
				"offset":offset,
				"count":count
			};
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(reqBody)
			};
			const resp = await requestUrl(req);
            const errorcode = resp.json["errcode"]
            if ( errorcode !== 0 && errorcode !== undefined) {
                new Notice(`Batch Get Material failed. errcode ${errorcode},` + resp.json["errmsg"]);
				return
            }
			const respObj: BatchGetMaterial = JSON.parse(resp.text)
			var frontmat: MDFrontMatterContent = new MDFrontMatterContent();
			const nhm = new NodeHtmlMarkdown(
				/* options (optional) */ {}, 
				/* customTransformers (optional) */ undefined,
				/* customCodeBlockTranslators (optional) */ undefined
			);
			if(type === "news") {
				const objItems = respObj.item as NewsItem[]
				if (objItems.length < 1) {
					new Notice('No News Data from wechat public');
				}
				for (let i = 0; i < objItems.length; i++) {
					const objItem = objItems[i];
					const item = objItem.content.news_item[0]
					const date = new Date(objItem.content.create_time * 1000);
					const dateString = date.toISOString(); 	
					
					var contentMD = ""
					var filePath = ""
					var mdText = ""
					frontmat.author = item.author
					frontmat.create_time = dateString
					frontmat.url = item.url
					frontmat.media_id = objItem.media_id
					frontmat.content_source_url = item.content_source_url
					frontmat.thumb_media_id = item.thumb_media_id
					frontmat.thumb_url =item.thumb_url
					contentMD = nhm.translate(item.content);
					filePath = `${setings.downloadFolder}/${item.title}.md`
					mdText = this.makeArticleContent(frontmat, contentMD)
					await this.app.vault.create(filePath, mdText);
				}
			} else {
				const objItem = respObj.item as MediaItem[];
				const extfile = this.getFileExtent(type)
				if (extfile === "no") {
					new Notice(`Not support type format ${type}`);
					return;
				}
				for (let i = 0; i < objItem.length; i++) {
					const item = objItem[i];
					var filePath = ""
					filePath = `${setings.downloadFolder}/${item.name}.${extfile}`
					const resp = await requestUrl(item.url);
					this.app.vault.createBinary(filePath, resp.arrayBuffer)
				}
			}
			// console.log(respObj);
			// return
			new Notice(`Success batch Get Material`);
			return;
		} catch (e) {
			new Notice(
				'Failed to batch Get Material. Please check your appId, secret,parameter and try again.'
			);
			console.error('Get Material error' + e);
		}
	}

	async getArticleCover(): Promise< CoverInfo[] | undefined> {
		try {
			const setings = get(settingsStore)
			const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return undefined
			}
	
			const url = `${this.baseUrl}/material/batchget_material?access_token=${setings.accessToken}`;
			const reqBody = {
				"type": "image",
				"offset":0,
				"count":20
			};
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify(reqBody)
			};
			const resp = await requestUrl(req);
			const errorcode = resp.json["errcode"]
			if ( errorcode !== 0 && errorcode !== undefined) {
				new Notice(`get Article Cover failed. errcode ${errorcode},` + resp.json["errmsg"]);
				return undefined
			}
			console.log(resp.text);
			const respObj: BatchGetMaterial = JSON.parse(resp.text)
			var images:CoverInfo[] = [];
			const objItems = respObj.item as MediaItem[]
			for (let i = 0; i < objItems.length; i++) {
				const img = objItems[i];
				images.push(new CoverInfo(img.media_id, img.name));
			}
			return images
		} catch (e) {
			new Notice(
				'Failed to get Article Cover. Please check your appId, secret,parameter and try again.'
			);
			console.error('Get Material error' + e);
		}
	}
	async handleMDImage(content: string): Promise<string> {
		const imageRegex = /!\[.*?\]\((.*?)\)/g;
		const matches = Array.from(content.matchAll(imageRegex));
		const promises = matches.map(async (match) => {
			const imagePath = match[1];
			const responseUrl = await this.uploadImage(imagePath, "");
			return {
				match,
				responseUrl
			};
		});

		const replacements = await Promise.all(promises);
		let parsedContent = content;
		for (const { match, responseUrl } of replacements) {
			const [fullMatch, imagePath] = match;
			parsedContent = parsedContent.replace(fullMatch, `![image](${responseUrl})`);
		}

		// console.log(parsedContent);
		return parsedContent
	}
	async uploadImage(path: string, fileName: string): Promise<string |undefined> {
        try {
			const setings = get(settingsStore)

			var blobBytes: ArrayBuffer | null = null;
			if (path.startsWith("http")) {
				const imgresp = await requestUrl(path);
				blobBytes = imgresp.arrayBuffer
			} else {
				const imgfile = this.app.vault.getAbstractFileByPath(path);
				if (imgfile instanceof TFile) {
					const data = await this.app.vault.readBinary(imgfile);
					blobBytes = data
				} else {
					new Notice('Please input correct file relative path in obsidian');
					return
				}				
			}

			const boundary = chooseBoundary()
			const end_boundary = '\r\n--' + boundary + '--\r\n';
			let formDataString = '';
			formDataString += '--' + boundary + '\r\n';
			
			const contentType = mime.contentType(path);
			formDataString += `Content-Disposition: form-data; name="media"; filename=\"${fileName}.png\"` + '\r\n';
			formDataString += `Content-Type: ${contentType}` + '\r\n\r\n';

			const formDatabuffer = Buffer.from(formDataString, 'utf-8');	// utf8 encode, for chinese
			var resultArray = Array.from(formDatabuffer);
			// console.log(formDataString);
			// return
			if (blobBytes !== null) {
				var pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
				var endBoundaryArray = [];
				for (var i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
					endBoundaryArray.push(end_boundary.charCodeAt(i));
				}
				var postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray); // 合并文本、图片数据得到最终要发送的数据
				var post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
				// console.log(post_typedArray)

				const url = `${this.baseUrl}/media/uploadimg?access_token=${setings.accessToken}`;
				const header = {
					'Content-Type': 'multipart/form-data; boundary=' + boundary,
					'Accept-Encoding': 'gzip, deflate, br',
					'Accept': '*/*', 
					'Connection': 'keep-alive',
				}; 

				const req: RequestUrlParam = {
					url: url,
					method: 'POST',
					headers: header,
					body: post_typedArray.buffer,
				};
				const resp = await requestUrl(req);
				const media_id = resp.json["url"];
				if (media_id === undefined) {
					const errcode = resp.json["errcode"];
					const errmsg = resp.json["errmsg"];
					console.log(errmsg);
					new Notice(`uploadMaterial, errorCode: ${errcode}, errmsg: ${errmsg}`);
					return
				}
				new Notice(`Success upload Image url ${media_id}.`);
				return media_id
			} else {
				// throw new Error('resrouce is empty,blobBytes, Failed to upload image');
			}
		} catch (e) {
			new Notice(
				'Failed to upload image'
			);
			console.error('upload image error' + e);
		}
	}

	public makeArticleContent(frontMatter: MDFrontMatterContent, markdownContent: string) {
		const frontMatterStr = stringifyYaml(frontMatter);
		return '---\n' + frontMatterStr + '---\n' + markdownContent;
	}

	private getFileExtent(type: string): string {
		if (type === "image") {
			return "png"
		} else if (type === "video") {
			return "mp4"
		} else if (type === "voice") {
			return "webm"
		} else if (type === "thumb") {
			return "jpg"
		} else {
			return "no";
		}
	}
}
