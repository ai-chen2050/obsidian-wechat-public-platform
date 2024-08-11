import { Notice, requestUrl, request, RequestUrlParam, Platform, FrontMatterCache, TFile, App, Vault, stringifyYaml, FileSystemAdapter, normalizePath, PluginManifest } from 'obsidian';
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
import { chooseBoundary, isWebp, jsonToUrlEncoded } from 'utils/cookiesUtil';
import { markedParse, ParseOptions } from './markdown/parse';
import { calloutStyle } from './style/callouts';

export default class ApiManager {
	app: App;
	manifest: PluginManifest;
	pluginPath: string;
	customCssPath: string;
	customCss: string;

	constructor(app: App, manifest: PluginManifest) {
        this.app = app;
		this.manifest = manifest;
		this.pluginPath = this.app.vault.configDir + '/plugins/' + this.manifest.id;
		this.customCssPath = this.pluginPath + '/custom.css';
		this.setCostomCss();
    }

	readonly baseWxUrl: string = 'https://api.weixin.qq.com/cgi-bin';
    readonly expireDuration : number = 7200;

	private getHeaders() {
		return {
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
		};
	}

	private getBjhHeaders() {
		return {
			"accept": "application/json, text/plain, */*",
			"accept-language": "zh-CN,zh;q=0.9",
			"cache-control": "no-cache",
			"pragma": "no-cache",
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

	public async setCostomCss() {
		try {
			new Notice('Custom css activated');
			const cssContent = await this.app.vault.adapter.read(this.customCssPath);
            this.customCss = cssContent;
		} catch (error) {
			this.customCss = "";
			new Notice('No custom.css, use default css');
			console.error("Error reading custom.css:", error);
			// You can set customStyle to a default value or leave it empty
			// customStyle = '/* default styles */';
		}
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
			res = juice.inlineContent(html, basicStyle + wechatFormat + codeStyle + calloutStyle + this.customCss, {
				inlinePseudoElements: true,
				preserveImportant: true,
			});
		} catch (e) {
			new Notice("请检查 CSS 文件是否编写正确！");
		}

		return res;
	}

	public formatCodeHTML(html: string) {
		// 使用正则表达式匹配 <code> 标签中的内容
		const formattedHTML = html.replace(/(<code[^>]*>)(.*?)<\/code>/gs, function(match, p1, p2) {
			// console.log(match);
			// console.log("p1", p1,"\n p2", p2);
			
			let replacedCode = "";
			const lines = p2.split("\n");
			for (let i = 0; i < lines.length - 1; i++) {
				replacedCode += p1 + lines[i] + "</code>";
			}
			return p1 + replacedCode;
		  });
			  
		return formattedHTML;
	}

	public async refreshAccessToken(appid: string, secret: string) : Promise<Boolean> {
        if(appid === '' || secret === '') {
            new Notice('Please input correct [appid] and [secret]');
            return false;
        }

        if ((get(settingsStore).lastAccessKeyTime + this.expireDuration) <  new Date().getTime()) {
            const url = `${this.baseWxUrl}/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
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
                console.error(errmsg);
                new Notice(`尝试刷新AccessToken失败, errorCode: ${errcode}, errmsg: ${errmsg}`);
				return false;
            } else {
                new Notice('刷新 AccessToken 成功');
                settingsStore.actions.setAccessToken(respAccessToken);
            }
        }
		return true;
	}

	public async refreshBJHToken(cookie: string, token: string) : Promise<Boolean> {
        if(cookie === '' || token === '') {
            new Notice('Please input correct [cookie] and [token]');
            return false;
        }

		const url = `https://baijiahao.baidu.com/builder/app/appinfo`;
		let BJHheader:Record<string,string> = this.getBjhHeaders();
		BJHheader['Cookie'] = cookie;
		BJHheader['token'] = token;
 		const req: RequestUrlParam = {
			url: url,
			method: 'HEAD',
			headers: BJHheader
		};
		const resp = await requestUrl(req);
		// console.log(resp.headers);
		
		const respAccessToken: string = resp.headers["token"];
		if (respAccessToken === undefined) {
			const errcode = resp.json["errcode"];
			const errmsg = resp.json["errmsg"];
			console.error(errmsg);
			new Notice(`尝试刷新AccessToken失败, errorCode: ${errcode}, errmsg: ${errmsg}`);
			return false;
		} else {
			new Notice('刷新 AccessToken 成功');
			settingsStore.actions.setBjhJwtToken(respAccessToken);
		}
		return true;
	}

	getCustomCssURL() {
        const version = this.manifest.version;
        return `https://github.com/ai-chen2050/obsidian-wechat-public-platform/releases/download/${version}/custom.css`;
    }

    async downloadCustomCss() {
        try {
            if (await this.app.vault.adapter.exists(this.customCssPath)) {
                new Notice('Custom css file exists.')
                return;
            }
            const res = await requestUrl(this.getCustomCssURL());
            const data = res.arrayBuffer;
			const decoder = new TextDecoder('utf-8');
			await this.app.vault.adapter.write(this.customCssPath, decoder.decode(data));
            new Notice('Download Custom css file completion');
        } catch (error) {
            console.error(error);
            await this.removeCustomCss();
            new Notice('Download failed, please check the network!');
        }
    }

    async removeCustomCss() {
        try {
            const adapter = this.app.vault.adapter;
            if (await adapter.exists(this.customCssPath)) {
                await adapter.remove(this.customCssPath);
            }
            new Notice('Empty complete!');
        } catch (error) {
            console.error(error);
            new Notice('Failed to clear theme!');
        }
    }

	async openPluginFolder() {
	    const path = require('path');
        const adapter = this.app.vault.adapter as FileSystemAdapter;
		const vaultRoot = adapter.getBasePath();
		const plugin = this.pluginPath;
        if (!await adapter.exists(plugin)) {
            await adapter.mkdir(plugin);
        }
		const dst = path.join(vaultRoot, plugin);
		const { shell } = require('electron');
		shell.openPath(dst);
	}
    
	async uploadMaterial(path: string, fileType: string, fileName: string): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}
			
			let blobBytes: ArrayBuffer | null = null;
			if (path.startsWith("http")) {
				const imgresp = await requestUrl(path);
				blobBytes = imgresp.arrayBuffer
			} else {
				let nPath = normalizePath(path);
				if (nPath.startsWith("./")) {
					nPath = nPath.slice(2);
				}
				const imgfile = this.app.vault.getAbstractFileByPath(nPath);
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
			let resultArray = Array.from(formDatabuffer);
			// console.log(formDataString);
			// return
			if (blobBytes !== null) {
				let pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
				let endBoundaryArray = [];
				for (let i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
					endBoundaryArray.push(end_boundary.charCodeAt(i));
				}
				let postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray); // 合并文本、图片数据得到最终要发送的数据
				let post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
				// console.log(post_typedArray)

				const url = `${this.baseWxUrl}/material/add_material?access_token=${setings.accessToken}&type=${fileType}`;
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
					console.error(errmsg);
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

	async newDraftToWechat(filePath: string, title: string, content: string, frontmatter: FrontMatterCache, only_id: string = ""): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}

			let thumb_media_id : string | undefined = ""
			let author = ""; let digest = ""; let content_source_url = ""; let need_open_comment = 0;
			if (frontmatter !== undefined) {
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
				author = frontmatter["author"];
				digest = frontmatter["digest"];
				content_source_url = frontmatter["source_url"];
				need_open_comment = frontmatter["open_comment"];
			} else {
				if (only_id !== "") {
					thumb_media_id = only_id;
				} else {
					new Notice('Please set banner of article, thumb_media_id, banner, banner_path in file frontManager');
					return
				}
			}
			
			const MdImagedContent = await this.handleMDImage(filePath, content, 'wx')
			// todo: move to other please
			const parseOptions:ParseOptions = {
				lineNumber: true,
				linkStyle: 'footnote'
			};

			const htmlText = await markedParse(MdImagedContent, parseOptions, [])
			
			// console.log(htmlText + "\n");
			// const htmlText1 = this.formatCodeHTML(htmlText)
			// console.log(htmlText1 + "\n");
			const htmlText2 = this.solveHTML(`<section id="nice">` + htmlText +`</section>`)
			// console.log(htmlText2);
			// return

			const url = `${this.baseWxUrl}/draft/add?access_token=${setings.accessToken}`;
            const article: ArticleElement = {
                title: title,
                author: author,
                digest: digest,
                content: htmlText2.replace(/[\r\n]/g, ""),
                content_source_url: content_source_url,
                thumb_media_id: thumb_media_id!,
                need_open_comment: need_open_comment,
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
				console.error(errmsg);
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

			const url = `${this.baseWxUrl}/freepublish/submit?access_token=${setings.accessToken}`;
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

	// group send push article to fans
	async sendAll(media_id: string): Promise<string |undefined> {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return
			}

			const url = `${this.baseWxUrl}/message/mass/sendall?access_token=${setings.accessToken}`;
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
                new Notice(`Failed to sending all fans. errcode ${errorcode},` + resp.json["errmsg"]);
				return
            }
			new Notice(`Success Release msg_data_id ${resp.json["msg_data_id"]}.`);
			return resp.json["msg_data_id"];
		} catch (e) {
			new Notice(
				'Failed to sending all fans. Please check your appId, secret and try again.'
			);
			console.error('send all fans error' + e);
		}
	}

	async batchGetMaterial(type: string, offset: number, count: number) {
        try {
            const setings = get(settingsStore)
            const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false || isNaN(offset) || isNaN(count)) {
				return
			}

			const url = `${this.baseWxUrl}/material/batchget_material?access_token=${setings.accessToken}`;
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
			let frontmat: MDFrontMatterContent = new MDFrontMatterContent();
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
					
					let contentMD = ""
					let filePath = ""
					let mdText = ""
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
					let filePath = ""
					filePath = `${setings.downloadFolder}/${item.name}`
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
	
			const url = `${this.baseWxUrl}/material/batchget_material?access_token=${setings.accessToken}`;
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
			// console.log(resp.text);
			const respObj: BatchGetMaterial = JSON.parse(resp.text)
			let images:CoverInfo[] = [];
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

	async handleMDImage(filePath:string, content: string, to: string): Promise<string> {
		const imageRegex = /!\[.*?\]\((.*?)\)/g;	// for ![]()
		const matches = Array.from(content.matchAll(imageRegex));
		const promises = matches.map(async (match) => {
			const imagePath = match[1];
			let responseUrl;
			if (to === 'wx') {
				responseUrl = await this.uploadImageToWx(filePath, imagePath, "");
			} else if(to === 'bjh') {
				responseUrl = await this.uploadImageToBjh(filePath, imagePath, "");
			}
			return {
				match,
				responseUrl
			};
		});

		const regex = /!\[\[(.*?)\]\]/g;	// for ![[]]
		const matches2 = Array.from(content.matchAll(regex));
		const promises2 = matches2.map(async (match) => {
			const imagePath = match[1];
			const imgfile: TFile | undefined = this.app.vault.getFiles().find((value) => value.name === imagePath);
			const responseUrl = await this.uploadImageToWx(filePath, imgfile?.path!, "");
			return {
				match,
				responseUrl
			};
		});

		let parsedContent = content;
		const replacements = await Promise.all(promises);
		for (const { match, responseUrl } of replacements) {
			const [fullMatch, imagePath] = match;
			parsedContent = parsedContent.replace(fullMatch, `![image](${responseUrl})`);
		}

		const replacements2 = await Promise.all(promises2);
		for (const { match, responseUrl } of replacements2) {
			const [fullMatch, imagePath] = match;
			parsedContent = parsedContent.replace(fullMatch, `![image](${responseUrl})`);
		}

		// console.log(parsedContent);
		return parsedContent
	}

	async uploadImageToWx(filePath:string, imgpath: string, fileName: string): Promise<string |undefined> {
        try {
			const setings = get(settingsStore)
			const pass = await this.refreshAccessToken(setings.appid, setings.secret)
			if (pass === false) {
				return undefined
			}

			let blobBytes: ArrayBuffer | null = null;
			if (imgpath.startsWith("http")) {
				const imgresp = await requestUrl(imgpath);
				blobBytes = imgresp.arrayBuffer
			} else {
				let nPath = normalizePath(imgpath);
				if (nPath.startsWith("./")) {
					nPath = filePath + nPath.slice(1);
				}
				const imgfile = this.app.vault.getAbstractFileByPath(nPath);
				// console.log(imgfile);
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
			
			const contentType = mime.contentType(imgpath);
			formDataString += `Content-Disposition: form-data; name="media"; filename=\"${fileName}.png\"` + '\r\n';
			formDataString += `Content-Type: ${contentType}` + '\r\n\r\n';

			const formDatabuffer = Buffer.from(formDataString, 'utf-8');	// utf8 encode, for chinese
			let resultArray = Array.from(formDatabuffer);
			// console.log(formDataString);
			// return
			if (blobBytes !== null) {
				let pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
				let endBoundaryArray = [];
				for (let i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
					endBoundaryArray.push(end_boundary.charCodeAt(i));
				}
				let postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray); // 合并文本、图片数据得到最终要发送的数据
				let post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
				// console.log(post_typedArray)

				const url = `${this.baseWxUrl}/media/uploadimg?access_token=${setings.accessToken}`;
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
					console.error(errmsg);
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

	async uploadImageToBjh(filePath:string, imgpath: string, fileName: string): Promise<string |undefined> {
        try {
			const setings = get(settingsStore)
			let blobBytes: ArrayBuffer | null = null;
			if (imgpath.startsWith("http")) {
				const imgresp = await requestUrl(imgpath);
				blobBytes = imgresp.arrayBuffer
			} else {
				let nPath = normalizePath(imgpath);
				if (nPath.startsWith("./")) {
					nPath = filePath + nPath.slice(1);
				}
				const imgfile = this.app.vault.getAbstractFileByPath(nPath);
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
			formDataString += `Content-Disposition: form-data; name="type"` + '\r\n\r\n' + 'image' + '\r\n';
			
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="app_id"` + '\r\n\r\n' + setings.BjhAppID + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="is_waterlog"` + '\r\n\r\n' + '1' + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="save_material"` + '\r\n\r\n' + '1' + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="no_compress"` + '\r\n\r\n' + '0' + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="is_events"` + '\r\n\r\n' + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			formDataString += `Content-Disposition: form-data; name="article_type"` + '\r\n\r\n' + 'news' + '\r\n';
			formDataString += '--' + boundary + '\r\n';
			let contentType = mime.contentType(imgpath);
			if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/jpg") {
				contentType = "image/png";
			}
			formDataString += `Content-Disposition: form-data; name="media"; filename=\"${fileName}.png\"` + '\r\n';
			formDataString += `Content-Type: ${contentType}` + '\r\n\r\n';			
			
			const formDatabuffer = Buffer.from(formDataString, 'utf-8');	// utf8 encode, for chinese
			let resultArray = Array.from(formDatabuffer);
			// console.log(formDataString);
			// return
			if (blobBytes !== null) {
				let pic_typedArray = new Uint8Array(blobBytes); // 把buffer转为typed array数据、再转为普通数组使之可以使用数组的方法
				if (isWebp(pic_typedArray)) {
					new Notice("not support format image/webp, use the pointed cover");
					// todo: to be updated later
					const pointedCover = "https://mmbiz.qpic.cn/mmbiz_jpg/avKRXZvpU06jcDsZoj2IPxLtG08lfq3hvVUianAGoxyc5d3hpsic3CPoRTeiaNBvqr0LaSHcES0x1k1cvwxUVSoxA/0?wx_fmt=jpeg";
					const imgresp = await requestUrl(pointedCover);
					pic_typedArray = new Uint8Array(imgresp.arrayBuffer);
				} 
				let endBoundaryArray = [];
				for (let i = 0; i < end_boundary.length; i++) { // 最后取出结束boundary的charCode
					endBoundaryArray.push(end_boundary.charCodeAt(i));
				}
				let postArray = resultArray.concat(Array.prototype.slice.call(pic_typedArray), endBoundaryArray); // 合并文本、图片数据得到最终要发送的数据
				let post_typedArray = new Uint8Array(postArray); // 把最终结果转为typed array，以便最后取得buffer数据
				// console.log(post_typedArray)

				const url = `https://baijiahao.baidu.com/pcui/picture/uploadproxy`;
				const header = {
					'Content-Type': 'multipart/form-data; boundary=' + boundary,
					'Accept-Encoding': 'gzip, deflate, br',
					'Accept': '*/*', 
					'Connection': 'keep-alive',
					'Referer': 'https://baijiahao.baidu.com/builder/rc/edit?type=news',
					"token": setings.BjhJwtToken,
					"Cookie": setings.BjhCookie,
				}; 

				const req: RequestUrlParam = {
					url: url,
					method: 'POST',
					headers: header,
					body: post_typedArray.buffer,
				};
				const resp = await requestUrl(req);
				const errcode = resp.json["errno"];
				if (errcode !== 0) {
					const errmsg = resp.json["errmsg"];
					console.error(decodeURIComponent(JSON.stringify(resp.json)));
					new Notice(`uploadMaterial, errorCode: ${errcode}, errmsg: ${errmsg}`);
					return
				}
				const media_id = resp.json["ret"]["https_url"];
				new Notice(`Success upload Image url ${media_id}.`);
				return media_id
			} else {
				throw new Error('resrouce is empty,blobBytes, Failed to upload image');
			}
		} catch (e) {
			new Notice(
				'Failed to upload image'
			);
			console.error('upload image error' + e);
		}
	}

	async publishToBjh(filePath: string, title: string, content: string, frontmatter: FrontMatterCache): Promise<string |undefined> {
        try {
			const setings = get(settingsStore);
			await this.refreshBJHToken(setings.BjhCookie, setings.BjhJwtToken);
			
			let BjhHeader: Record<string, string> = this.getBjhHeaders();
			BjhHeader["content-type"] = "application/x-www-form-urlencoded";
			BjhHeader["Referer"] = "https://baijiahao.baidu.com/builder/rc/edit?type=news";
			BjhHeader["token"] = setings.BjhJwtToken;
			BjhHeader["Cookie"] = setings.BjhCookie;

			let cover_media_url : string | undefined = ""
			let author = ""; let digest = "";
			if (frontmatter !== undefined) {
				if( frontmatter["banner"] !== undefined && frontmatter["banner"] !== ""){
					cover_media_url = await this.uploadImageToBjh(filePath, frontmatter["banner"], title+"_banner");
				} else if( frontmatter["banner_path"] !== undefined && frontmatter["banner_path"] !== ""){
					cover_media_url = await this.uploadImageToBjh(filePath, frontmatter["banner_path"], title+"_banner");
				}

				if (cover_media_url === "" && frontmatter["banner"] === undefined && frontmatter["banner_path"] === undefined) {
					new Notice('Please set banner of article, thumb_media_id, banner, banner_path in file frontManager');
					return
				}
				author = frontmatter["author"];
				digest = frontmatter["digest"];
			} else {
				new Notice('Please set banner of article, banner, banner_path in file frontManager');
				return
			}
			const MdImagedContent = await this.handleMDImage(filePath, content, 'bjh')
			const htmlText = await marked.parse(MdImagedContent)
			const htmlText1 = this.formatCodeHTML(htmlText)
			const htmlText2 = this.solveHTML(`<section id="nice">` + htmlText1 +`</section>`) + `<img src="${cover_media_url}"><br>`
			// console.log(htmlText2);
			// return

			const url = `https://baijiahao.baidu.com/pcui/article/publish?callback=bjhpublish`;
            const cover_images = [{
				"src": cover_media_url!,
				"cropData": {"x":0,"y":0,"width":2048,"height":1365},
				"machine_chooseimg":0,
				"isLegal":1
			}];

            const cover_images_map = [{ "src": cover_media_url!, }];
			const reqBody = {
				"type": "news",
                "title": title,
                "author": author,
                "abstract": digest,
                "content": htmlText2,
				"auto_mount_goods": "1",
				"len": htmlText2.length.toString(),
                "vertical_cover": cover_media_url!,
                "cover_images": JSON.stringify(cover_images),
                "_cover_images_map": JSON.stringify(cover_images_map),
            };
			const activityList = `&activity_list%5B0%5D%5Bid%5D=408&activity_list%5B0%5D%5Bis_checked%5D=0&activity_list%5B1%5D%5Bid%5D=ttv&activity_list%5B1%5D%5Bis_checked%5D=1&activity_list%5B2%5D%5Bid%5D=reward&activity_list%5B2%5D%5Bis_checked%5D=1&activity_list%5B3%5D%5Bid%5D=aigc_bjh_status&activity_list%5B3%5D%5Bis_checked%5D=0&source_reprinted_allow=0&abstract_from=2&isBeautify=false&usingImgFilter=false&cover_layout=one`;
			const postStr = `&source=upload&cover_source=upload&subtitle=&bjhtopic_id=&bjhtopic_info=&clue=1&bjhmt=&order_id=&aigc_rebuild=&image_edit_point=%5B%7B%22img_type%22%3A%22cover%22%2C%22img_num%22%3A%7B%22template%22%3A0%2C%22font%22%3A0%2C%22filter%22%3A0%2C%22paster%22%3A0%2C%22cut%22%3A0%2C%22any%22%3A0%7D%7D%2C%7B%22img_type%22%3A%22body%22%2C%22img_num%22%3A%7B%22template%22%3A0%2C%22font%22%3A0%2C%22filter%22%3A0%2C%22paster%22%3A0%2C%22cut%22%3A0%2C%22any%22%3A0%7D%7D%5D`
			const bodyContent = jsonToUrlEncoded(reqBody) + activityList + postStr;
			const req: RequestUrlParam = {
				url: url,
				method: 'POST',
				headers: BjhHeader,
				body: bodyContent,
			};

			const resp = await requestUrl(req);
			const errcode = resp.json["errno"];
			if (errcode !== 0) {
				const errcode = resp.json["errno"];
				const errmsg = resp.json["errmsg"];
				console.error(errmsg);
				// console.log("resp = " + decodeURIComponent(JSON.stringify(resp.json)));
				new Notice(`newDraft, errorCode: ${errcode}, errmsg: ${errmsg}`);
				return
			}
			const media_id = resp.json["ret"]["url"];
			if (resp.headers['token'] !== '') {
				settingsStore.actions.setBjhJwtToken(resp.headers['token']);
			}
			new Notice(`Success publish article media_id ${media_id}.`);
			return media_id
		} catch (e) {
			new Notice(
				'Failed to publish to baidu bjh. Please check your appId, secret and try again.'
			);
			console.error('publish to baidu bjh error' + e);
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