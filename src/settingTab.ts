import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import WeChatPublic from '../main'
import { settingsStore } from './settings'
import { getEncodeCookieString } from '../utils/cookiesUtil'
import { WeChatPublicLoginModal, WeChatPublicLogoutModal } from './loginoutModal';
import { get } from 'svelte/store';

export class WeChatPublicSettingTab extends PluginSettingTab {
	plugin: WeChatPublic;

	constructor(app: App, plugin: WeChatPublic) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Wechat Public Settings'});
		const isCookieValid = get(settingsStore).isCookieValid;
		if (isCookieValid) {
			this.showLogout();
		} else {
			this.showLogin();
		}

		this.setfield();
	}

	private showLogout(): void {
		document.createRange().createContextualFragment;
		const desc = document.createRange().createContextualFragment(
			`1. 登录：点击登录按钮，在弹出页面【扫码登录】。
             2. 注销：点击注销，在弹出书架页面右上角点击头像，下拉菜单选择【退出登录】`
		);

		new Setting(this.containerEl)
			.setName(`微信读书已登录，用户名：  ${get(settingsStore).user}`)
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText('注销')
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						const logoutModel = new WeChatPublicLogoutModal(this);
						await logoutModel.doLogout();
						this.display();
					});
			})
			.addButton((button) => {
				return button
					.setButtonText('拷贝Cookie')
					.setCta()
					.onClick(async () => {
						const cookieStr = getEncodeCookieString();
						navigator.clipboard.writeText(cookieStr).then(
							function () {
								new Notice('拷贝Cookie到剪切板成功！');
							},
							function (error) {
								new Notice('拷贝Cookie到剪切板失败！');
								console.error('拷贝微信读书Cookie失败', error);
							}
						);
					});
			});
	}

	private showLogin(): void {
		new Setting(this.containerEl).setName('登录微信读书').addButton((button) => {
			return button
				.setButtonText('登录')
				.setCta()
				.onClick(async () => {
					button.setDisabled(true);
					const loginModel = new WeChatPublicLoginModal(this);
					await loginModel.doLogin();
					this.display();
				});
		});
	}

	private setfield(): void {
		new Setting(this.containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
