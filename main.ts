import { App, Editor, MarkdownView, Modal, Notice, Plugin, Setting, TFile, addIcon, requestUrl } from 'obsidian';
import { WeChatPublicSettingTab } from "./src/settingTab"
import ApiManager from 'src/api';
import { settingsStore } from 'src/settings';
import { FrontMatterManager } from 'utils/frontmatter';
import { WeChatUploadMaterialModal, WeChatDownloadMaterialModal, OpenFileModal, CoverIDSuggestModal, FileSuggestModal } from 'src/showModals';
import { CoverInfo } from 'src/models';

interface WeChatPublicSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: WeChatPublicSettings = {
	mySetting: 'default'
}

export default class WeChatPublic extends Plugin {
	settings: WeChatPublicSettings;
	frontManager: FrontMatterManager;

	async onload() {
		settingsStore.initialise(this);
		this.frontManager = new FrontMatterManager(this.app);
		const apiManager = new ApiManager(this.app);

		const ribbonIconEl = this.addRibbonIcon("send", '发布到草稿箱', (evt: MouseEvent) => {
			new FileSuggestModal(this.app, this.app.vault.getMarkdownFiles(), async (file: TFile) => {
				const text = await this.frontManager.removeFrontMatter(file)
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache?.frontmatter!["thumb_media_id"] === undefined && 
						cache?.frontmatter!["banner"] === undefined &&
							cache?.frontmatter!["banner_path"] === undefined) {
					const covers = await apiManager.getArticleCover()
					if (covers === undefined) {
						return
					}
					new CoverIDSuggestModal(this.app, covers, async (cover: CoverInfo) => {
						await apiManager.newDraft(file.basename, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await apiManager.newDraft(file.basename, text, cache?.frontmatter!)
				}
			}).open();
		});
		ribbonIconEl.addClass('wechat-pblic-ribbon-class');

		this.addCommand({
			id: 'send-all-fans-by-wechatpublic-plugin',
			name: 'Send to all fans by WeChatPublic plugin【 normal account one shot a day 】',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)
				const cache = this.app.metadataCache.getFileCache(file!);
				
				const media_id = await apiManager.newDraft(basename!, text, cache?.frontmatter!)
				await apiManager.sendAll(media_id!)
			}
		});

		this.addCommand({
			id: 'release-article-by-wechatpublic-plugin',
			name: 'Release article by WeChatPublic plugin',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)

				const cache = this.app.metadataCache.getFileCache(file!);
				const media_id = await apiManager.newDraft(basename!, text, cache?.frontmatter!)
				await apiManager.freepublish(media_id!)
			}
		});

		this.addCommand({
			id: 'add-draft-by-wechatpublic-plugin',
			name: 'add draft by WeChatPublic plugin',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)
				// console.log(text);
				const cache = this.app.metadataCache.getFileCache(file!);
				
				if (cache?.frontmatter!["thumb_media_id"] === undefined && 
						cache?.frontmatter!["banner"] === undefined &&
							cache?.frontmatter!["banner_path"] === undefined) {
					const covers = await apiManager.getArticleCover()
					if (covers === undefined) {
						return
					}
					new CoverIDSuggestModal(this.app, covers, async (cover: CoverInfo) => {
						await apiManager.newDraft(basename!, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await apiManager.newDraft(basename!, text, cache?.frontmatter!)
				}
			}
		});

		this.addCommand({
			id: 'upload-material-by-wechatpublic-plugin',
			name: 'upload material by WeChatPublic plugin.',
			callback: async () => {
				new WeChatUploadMaterialModal(this.app,async (path, name, type) => {
                    console.log(path, type, name);
					if (path === "" || type === "") {
						new Notice('Please input correct material details!');
						return
					}
					// const path = "https://mmbiz.qpic.cn/mmbiz_png/avKRXZvpU06RaicVPeDfRia2jZODXWV7qeRbL32r2FnWySlDTTkicCDWaTCoFszFlchcGxXlBN6efDeNf4sEJvV6w/640?wx_fmt=png";
					await apiManager.uploadMaterial(path, type, name)
                }).open();
				return
			}
		});

		this.addCommand({
			id: 'download-material-from-wechatpublic',
			name: 'download material from WeChatPublic.',
			callback: async () => {
				new WeChatDownloadMaterialModal(this.app,async (offset, type, totalCount) => {
                    console.log(type, offset, totalCount);
					if (offset === "" || type === "" || totalCount === "") {
						new Notice('Please input all fields!');
						return
					}
					await apiManager.batchGetMaterial(type, Number(offset), Number(totalCount))
                }).open();
				return
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new WeChatPublicSettingTab(this.app, this, apiManager));
	}

	onunload() {
		console.log('unloading WeChatPublic plugin', new Date().toLocaleString());
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
