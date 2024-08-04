import { App, Editor, MarkdownView, Modal, CachedMetadata, Notice, Plugin, Setting, TFile, addIcon, requestUrl, Menu, RequestUrlParam } from 'obsidian';
import { WeChatPublicSettingTab } from "./src/settingTab"
import ApiManager from 'src/api';
import { settingsStore } from 'src/settings';
import { FrontMatterManager } from 'utils/frontmatter';
import { WeChatUploadMaterialModal, WeChatDownloadMaterialModal, OpenFileModal, CoverIDSuggestModal, FileSuggestModal, YoutubeDownloadModal } from 'src/showModals';
import { CoverInfo } from 'src/models';
import { splitPathAndFile } from 'utils/path';

export default class WeChatPublic extends Plugin {
	frontManager: FrontMatterManager;
	apiManager: ApiManager;

	async onload() {
		new Notice('loading WeChatPublic plugin at '+ new Date().toLocaleString())
		settingsStore.initialise(this);
		this.frontManager = new FrontMatterManager(this.app);
		this.apiManager = new ApiManager(this.app);

		const ribbonIconEl = this.addRibbonIcon("send", '发布到草稿箱', (evt: MouseEvent) => {
			new FileSuggestModal(this.app, this.app.vault.getMarkdownFiles(), async (file: TFile) => {
				let filePath = "";
				if (file?.path !== undefined) {
					filePath = splitPathAndFile(file?.path)[0];
				}
				const text = await this.frontManager.removeFrontMatter(file)
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter === undefined || cache?.frontmatter!["thumb_media_id"] === undefined && 
						cache?.frontmatter!["banner"] === undefined &&
							cache?.frontmatter!["banner_path"] === undefined) {
					const covers = await this.apiManager.getArticleCover()
					if (covers === undefined) {
						return
					}
					new CoverIDSuggestModal(this.app, covers, async (cover: CoverInfo) => {
						await this.apiManager.newDraftToWechat(filePath, file.basename, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await this.apiManager.newDraftToWechat(filePath, file.basename, text, cache?.frontmatter!)
				}
			}).open();
		});
		ribbonIconEl.addClass('wechat-pblic-ribbon-class');
		// this.registerContextMenu();

		this.addCommand({
			id: 'send-all-wechat-subscribers',
			name: 'Send to all wechat subscribers【 normal account one shot a day 】',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				let filePath = "";
				if (file?.path !== undefined) {
					filePath = splitPathAndFile(file?.path)[0];
				}
				const text = await this.frontManager.removeFrontMatter(file!)
				const cache = this.app.metadataCache.getFileCache(file!);
				
				const media_id = await this.apiManager.newDraftToWechat(filePath, basename!, text, cache?.frontmatter!)
				await this.apiManager.sendAll(media_id!)
			}
		});

		this.addCommand({
			id: 'release-article-to-wechat-platform',
			name: 'Release article to WeChat platform',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				let filePath = "";
				if (file?.path !== undefined) {
					filePath = splitPathAndFile(file?.path)[0];
				}
				const text = await this.frontManager.removeFrontMatter(file!)

				const cache = this.app.metadataCache.getFileCache(file!);
				const media_id = await this.apiManager.newDraftToWechat(filePath, basename!, text, cache?.frontmatter!)
				await this.apiManager.freepublish(media_id!)
			}
		});

		this.addCommand({
			id: 'add-draft-to-wechat-platform',
			name: 'add draft to wechat platform',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				let filePath = "";
				if (file?.path !== undefined) {
					filePath = splitPathAndFile(file?.path)[0];
				}
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)
				// console.log(text);
				let cache = this.app.metadataCache.getFileCache(file!);
				if (cache?.frontmatter === undefined || cache?.frontmatter!["thumb_media_id"] === undefined && 
						cache?.frontmatter!["banner"] === undefined &&
							cache?.frontmatter!["banner_path"] === undefined) {
					const covers = await this.apiManager.getArticleCover()
					if (covers === undefined) {
						return
					}
					new CoverIDSuggestModal(this.app, covers, async (cover: CoverInfo) => {
						await this.apiManager.newDraftToWechat(filePath, basename!, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await this.apiManager.newDraftToWechat(filePath, basename!, text, cache?.frontmatter!)
				}
			}
		});

		this.addCommand({
			id: 'upload-material-to-wechat-platform',
			name: 'upload material to wechat platform',
			callback: async () => {
				new WeChatUploadMaterialModal(this.app,async (path, name, type) => {
					if (path === "" || type === "") {
						new Notice('Please input correct material details!');
						return
					}
					await this.apiManager.uploadMaterial(path, type, name)
                }).open();
				return
			}
		});

		this.addCommand({
			id: 'download-material-from-wechatpublic',
			name: 'download material from WeChatPublic.',
			callback: async () => {
				new WeChatDownloadMaterialModal(this.app,async (offset, type, totalCount) => {
					if (offset === "" || type === "" || totalCount === "") {
						new Notice('Please input all fields!');
						return
					}
					await this.apiManager.batchGetMaterial(type, Number(offset), Number(totalCount))
                }).open();
				return
			}
		});

		this.addCommand({
			id: 'publish-baidu-bjh-news',
			name: 'publish baidu bjh news',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					const file = view.file
					const basename = file?.basename
					let filePath = "";
					if (file?.path !== undefined) {
						filePath = splitPathAndFile(file?.path)[0];
					}
					const text = await this.frontManager.removeFrontMatter(file!)
					let cache = this.app.metadataCache.getFileCache(file!);
					await this.apiManager.publishToBjh(filePath, basename!, text, cache?.frontmatter!)
					return
				} catch (error) {
					console.error(error);
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new WeChatPublicSettingTab(this.app, this, this.apiManager));
	}

	onunload() {
		new Notice('unloading WeChatPublic plugin at '+ new Date().toLocaleString())
	}
}
