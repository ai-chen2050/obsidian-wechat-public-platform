import { App, Editor, MarkdownView, Modal, CachedMetadata, Notice, Plugin, Setting, TFile, addIcon, requestUrl, Menu, RequestUrlParam } from 'obsidian';
import { WeChatPublicSettingTab } from "./src/settingTab"
import ApiManager from 'src/api';
import { settingsStore } from 'src/settings';
import { FrontMatterManager } from 'utils/frontmatter';
import { WeChatUploadMaterialModal, WeChatDownloadMaterialModal, OpenFileModal, CoverIDSuggestModal, FileSuggestModal, YoutubeDownloadModal } from 'src/showModals';
import { CoverInfo } from 'src/models';
import { chooseBoundary, jsonToUrlEncoded } from 'utils/cookiesUtil';

interface WeChatPublicSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: WeChatPublicSettings = {
	mySetting: 'default'
}

export default class WeChatPublic extends Plugin {
	settings: WeChatPublicSettings;
	frontManager: FrontMatterManager;
	apiManager: ApiManager;

	async onload() {
		settingsStore.initialise(this);
		this.frontManager = new FrontMatterManager(this.app);
		this.apiManager = new ApiManager(this.app);

		const ribbonIconEl = this.addRibbonIcon("send", '发布到草稿箱', (evt: MouseEvent) => {
			new FileSuggestModal(this.app, this.app.vault.getMarkdownFiles(), async (file: TFile) => {
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
						await this.apiManager.newDraftToWechat(file.basename, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await this.apiManager.newDraftToWechat(file.basename, text, cache?.frontmatter!)
				}
			}).open();
		});
		ribbonIconEl.addClass('wechat-pblic-ribbon-class');
		this.registerContextMenu();

		this.addCommand({
			id: 'send-all-fans-by-wechatpublic-plugin',
			name: 'Send to all fans by WeChatPublic plugin【 normal account one shot a day 】',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file
				const basename = file?.basename
				const text = await this.frontManager.removeFrontMatter(file!)
				const cache = this.app.metadataCache.getFileCache(file!);
				
				const media_id = await this.apiManager.newDraftToWechat(basename!, text, cache?.frontmatter!)
				await this.apiManager.sendAll(media_id!)
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
				const media_id = await this.apiManager.newDraftToWechat(basename!, text, cache?.frontmatter!)
				await this.apiManager.freepublish(media_id!)
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
				let cache = this.app.metadataCache.getFileCache(file!);
				if (cache?.frontmatter === undefined || cache?.frontmatter!["thumb_media_id"] === undefined && 
						cache?.frontmatter!["banner"] === undefined &&
							cache?.frontmatter!["banner_path"] === undefined) {
					const covers = await this.apiManager.getArticleCover()
					if (covers === undefined) {
						return
					}
					new CoverIDSuggestModal(this.app, covers, async (cover: CoverInfo) => {
						await this.apiManager.newDraftToWechat(basename!, text, cache?.frontmatter!, cover.mediaID);
					}).open();
					return
				} else {
					await this.apiManager.newDraftToWechat(basename!, text, cache?.frontmatter!)
				}
			}
		});

		this.addCommand({
			id: 'upload-material-by-wechatpublic-plugin',
			name: 'upload material by WeChatPublic plugin.',
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
			id: 'download-youtube-video',
			name: 'download youtube video',
			callback: async () => {
				new YoutubeDownloadModal(this.app,async (videoUrl, name) => {
					if ((videoUrl === "" || !videoUrl.startsWith('http')) || name === "") {
						new Notice('Please input correct youtube video url!');
						return
					}
					await this.apiManager.getYoutubeVideo(videoUrl, name)
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
					const text = await this.frontManager.removeFrontMatter(file!)
					let cache = this.app.metadataCache.getFileCache(file!);
					await this.apiManager.publishToBjh(basename!, text, cache?.frontmatter!)
					return
				} catch (error) {
					console.log(error);
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new WeChatPublicSettingTab(this.app, this, this.apiManager));
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

	// 右键菜单
	registerContextMenu() {
        let addMemu = (mu: Menu, selection: string) => {
            mu.addItem((item) => {
                item.setTitle("Download video from youtube")
                    .setIcon("info")
                    .onClick(async () => {
                        this.apiManager.getYoutubeVideo(selection, chooseBoundary());
                    });
            });
        };
        // markdown 编辑模式 右键菜单
        this.registerEvent(
            this.app.workspace.on(
                "editor-menu",
                (menu: Menu, editor: Editor, view: MarkdownView) => {
                    let selection = editor.getSelection();
                    if (selection || selection.trim().length === selection.length) {
                        addMemu(menu, selection);
                    }
                }
            )
        );
        // markdown 预览模式 右键菜单
        this.registerDomEvent(document.body, "contextmenu", (evt) => {
            if ((evt.target as HTMLElement).matchParent(".markdown-preview-view")) {
                const selection = window.getSelection()!.toString().trim();
                if (!selection) return;

                evt.preventDefault();
                let menu = new Menu();
                addMemu(menu, selection);
                menu.showAtMouseEvent(evt);
            }
        });
    }
}
