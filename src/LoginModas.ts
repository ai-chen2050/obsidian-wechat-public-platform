import { Notice } from 'obsidian';
import { parseCookies } from '../utils/cookiesUtil';
import { settingsStore } from './settings';
import { WeChatPublicSettingTab } from './settingTab';

export class BjhLoginModel {
	private modal: any;
	private settingTab: WeChatPublicSettingTab;
	constructor(settingTab: WeChatPublicSettingTab) {
		this.settingTab = settingTab;
		const { remote } = require('electron');
		const { BrowserWindow: RemoteBrowserWindow } = remote;
		this.modal = new RemoteBrowserWindow({
			parent: remote.getCurrentWindow(),
			width: 960,
			height: 540,
			show: false
		});

		this.modal.once('ready-to-show', () => {
			this.modal.setTitle('登录百家号~');
			this.modal.show();
		});

		const session = this.modal.webContents.session;
		const filter = {
			urls: ['https://baijiahao.baidu.com/builder/app/appinfo']
		};
        
		session.webRequest.onSendHeaders(filter, (details: any) => {
			const cookies = details.requestHeaders['Cookie'];
			const Token = details.requestHeaders['token'];
			// const cookieArr = parseCookies(cookies);
            settingsStore.actions.setBjhCookie(cookies);
            settingsStore.actions.setBjhJwtToken(Token);
		});
	}

	async doLogin() {
		try {
			await this.modal.loadURL('https://baijiahao.baidu.com/builder/theme/bjh/login');
		} catch (error) {
			console.log(error);
			new Notice('加载百家号登录页面失败');
		}
	}

	onClose() {
		this.modal.close();
	}
}

export class BjhLogoutModel {
	private modal: any;
	private settingTab: WeChatPublicSettingTab;
	constructor(settingTab: WeChatPublicSettingTab) {
		this.settingTab = settingTab;
		const { remote } = require('electron');
		const { BrowserWindow: RemoteBrowserWindow } = remote;
		this.modal = new RemoteBrowserWindow({
			parent: remote.getCurrentWindow(),
			width: 960,
			height: 540,
			show: false
		});
		this.modal.once('ready-to-show', () => {
			this.modal.setTitle('注销百家号，右上角头像点击退出登录~');
			this.modal.show();
		});
		const session = this.modal.webContents.session;
		const filter = {
			urls: ['https://weread.qq.com/web/logout']
		};
		session.webRequest.onCompleted(filter, (details: any) => {
			if (details.statusCode == 200) {
				console.log('weread logout success, clear cookies...');
				settingsStore.actions.clearBjhCookie();
				this.settingTab.display();
				this.modal.close();
			}
		});
	}

	async doLogout() {
		await this.modal.loadURL('https://weread.qq.com/web/shelf/#logout');
	}

	onClose() {
		this.modal.close();
	}
}
