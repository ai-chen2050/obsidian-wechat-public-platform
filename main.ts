import { App, Editor, MarkdownView, Modal, Notice, Plugin, Setting, TFile, requestUrl } from 'obsidian';
import { WeChatPublicSettingTab } from "./src/settingTab"
import ApiManager from 'src/api';
import { settingsStore } from 'src/settings';
import { FrontMatterManager } from 'utils/frontmatter';
import { WeChatUploadMaterialModal, TestModal } from 'src/showModals';

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

		// const ribbonIconEl = this.addRibbonIcon('dice', 'Wechat Public', (evt: MouseEvent) => {
		// 	new Notice('This is a notice!');
		// });
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		this.addCommand({
			id: 'send-all-fees-on-wechatpublic',
			name: 'Send all fees on WeChatPublic【 normal account one shot a day 】',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)

				const cache = this.app.metadataCache.getFileCache(file!);
				if (cache?.frontmatter){
					console.log(cache?.frontmatter)
				}
				const media_id = await apiManager.newDraft(basename!, text, cache?.frontmatter!)
				await apiManager.sendAll(media_id!)
			}
		});

		this.addCommand({
			id: 'release-article-on-wechatpublic',
			name: 'Release article on WeChatPublic',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)

				const cache = this.app.metadataCache.getFileCache(file!);
				if (cache?.frontmatter){
					console.log(cache?.frontmatter)
				}
				const media_id = await apiManager.newDraft(basename!, text, cache?.frontmatter!)
				await apiManager.freepublish(media_id!)
			}
		});

		this.addCommand({
			id: 'add-draft-on-wechatpublic',
			name: 'add draft on WeChatPublic',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)
				console.log(text);

				const cache = this.app.metadataCache.getFileCache(file!);
				if (cache?.frontmatter){
					console.log(cache?.frontmatter)
				}
				
				apiManager.newDraft(basename!, text, cache?.frontmatter!)
			}
		});

		this.addCommand({
			id: 'upload-material-on-wechatpublic',
			name: 'upload material on WeChatPublic.【 wait support Formdata 】',
			callback: async () => {
				new WeChatUploadMaterialModal(this.app, (path, type, name) => {
                    console.log(path, type, name);
					if (path === "" || type === "") {
						new Notice('Please input correct material details!');
						return
					}
					// const path = "https://mmbiz.qpic.cn/mmbiz_png/avKRXZvpU06RaicVPeDfRia2jZODXWV7qeRbL32r2FnWySlDTTkicCDWaTCoFszFlchcGxXlBN6efDeNf4sEJvV6w/640?wx_fmt=png";
					// apiManager.uploadMaterial(path, type, name)
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
