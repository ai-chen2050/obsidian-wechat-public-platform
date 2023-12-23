import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import WeChatPublic from '../main'
import { settingsStore } from './settings'
import ApiManager from './api'
import { get } from 'svelte/store';
import pickBy from 'lodash.pickby';

export class WeChatPublicSettingTab extends PluginSettingTab {
	plugin: WeChatPublic;
	private apiManager: ApiManager;
	readonly expireDuration : number = 7200;   // seconds

	constructor(app: App, plugin: WeChatPublic, apiManeger: ApiManager) {
		super(app, plugin);
		this.plugin = plugin;
		this.apiManager = apiManeger;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Wechat Public Platform Settings'});
		if ((get(settingsStore).lastAccessKeyTime + this.expireDuration) <  new Date().getTime()) {
			this.showLogin();
		} else {
			this.showLogout();
		}

		this.setAppId();
		this.setSecret();
		this.setDownloadFolder();
		this.setBlacklist();
		this.setNoteLocationFolder();
	}

	private showLogout(): void {
		document.createRange().createContextualFragment;
		const desc = document.createRange().createContextualFragment(
			`若要退出清理 Secret,请点击 clean secret`
		);

		new Setting(this.containerEl)
			.setName(`微信公众平台已登录,当前 APP-ID: ${get(settingsStore).appid}`)
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText('Clean secret')
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						settingsStore.actions.clearSecret()
						this.display();
					});
			})
			.addButton((button) => {
				return button
					.setButtonText('Copy AccessKey')
					.setCta()
					.onClick(async () => {
						const accesskey = get(settingsStore).accessToken;
						navigator.clipboard.writeText(accesskey).then(
							function () {
								new Notice('拷贝AccessKey到剪切板成功！');
							},
							function (error) {
								new Notice('拷贝AccessKey到剪切板失败！');
								console.error('拷贝微信公众平台AccessKey失败', error);
							}
						);
					});
			});
	}

	private showLogin(): void {
		const desc = document.createRange().createContextualFragment(
			`测试前请先填写 [appid] 和 [secretkey], 此外请联系管理员将自己的外网 IP 添加至白名单。https://tool.lu/ip/`
		);

		new Setting(this.containerEl).setName('测试微信公众平台 API')
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText('Connect')
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						// reqest access token key
						await this.apiManager.refreshAccessToken(get(settingsStore).appid, get(settingsStore).secret);
						this.display();
					});
			});
	}

	private setAppId(): void {
		new Setting(this.containerEl)
			.setName('Setting appid')
			.setDesc('wechat public platform account appid')
			.addText(text => text
				.setPlaceholder('Enter your appid')
				.setValue(get(settingsStore).appid)
				.onChange(async (value) => {
					settingsStore.actions.setAppId(value);
				}));
	}

	private setSecret(): void {
		new Setting(this.containerEl)
			.setName('Setting secret')
			.setDesc('wechat public platform account secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(get(settingsStore).secret)
				.onChange(async (value) => {
					settingsStore.actions.setSecret(value);
				}));
	}

	private setNoteLocationFolder(): void {
		new Setting(this.containerEl)
			.setName('NoteLocationFolder')
			.setDesc('for future using')
			.addText((input) => {
				input.setPlaceholder('ur wechat release folder')
					 .setValue(get(settingsStore).noteLocationFolder)
					 .onChange((value: string) => {
						settingsStore.actions.setNoteLocationFolder(value);
				});
			});
	}

	private setDownloadFolder(): void {
		new Setting(this.containerEl)
			.setName('DownloadFolder')
			.setDesc('download folder from wechat public')
			.addDropdown((dropdown) => {
				const files = (this.app.vault.adapter as any).files;
				const folders = pickBy(files, (val: any) => {
					return val.type === 'folder';
				});

				Object.keys(folders).forEach((val) => {
					dropdown.addOption(val, val);
				});
				return dropdown
					.setValue(get(settingsStore).downloadFolder)
					.onChange(async (value) => {
						settingsStore.actions.setDownloadFolder(value);
					});
			});
	}

	private setBlacklist(): void {
		new Setting(this.containerEl)
			.setName('Blacklist')
			.setDesc('请填写永不会发布的文件夹,多个文件夹使用逗号「,」隔开')
			.addText((input) => {
				input.setPlaceholder('/self,/key,/secret')
					 .setValue(get(settingsStore).BlacklistFolder)
					 .onChange((value: string) => {
						settingsStore.actions.setBlacklistFolder(value);
				});
			});
	}
}
