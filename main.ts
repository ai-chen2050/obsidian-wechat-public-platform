import { App, Modal, Notice, Plugin, Setting } from 'obsidian';
import { WeChatPublicSettingTab } from "./src/settingTab"


interface WeChatPublicSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: WeChatPublicSettings = {
	mySetting: 'default'
}

export default class WeChatPublic extends Plugin {
	settings: WeChatPublicSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Wechat Public', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'release-article-on-wechatpublic',
			name: 'Release article on WeChatPublic',
			// checkCallback
			callback: () => {
				new WeChatPublicModal(this.app).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new WeChatPublicSettingTab(this.app, this));
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

class WeChatPublicModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
