import { settingsStore } from './settings'
import { parseCookies } from '../utils/cookiesUtil'
import { WeChatPublicSettingTab } from "./settingTab";
import { Notice } from 'obsidian';

interface HttpDetails {
	statusCode: number
}

export class WeChatPublicLoginModal {
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
			this.modal.setTitle('登录微信读书~');
			this.modal.show();
		});

		const session = this.modal.webContents.session;
		const filter = {
			urls: ['https://weread.qq.com/web/user?userVid=*']
		};
		session.webRequest.onSendHeaders(filter, (details) => {
			const cookies = details.requestHeaders['Cookie'];
			const cookieArr = parseCookies(cookies);
			const wr_name = cookieArr.find((cookie) => cookie.name == 'wr_name').value;
			if (wr_name !== '') {
				settingsStore.actions.setCookies(cookieArr);
				settingTab.display();
				this.modal.close();
			} else {
				this.modal.reload();
			}
		});
	}

	async doLogin() {
		try {
			await this.modal.loadURL('https://weread.qq.com/#login');
		} catch (error) {
			console.log(error);
			new Notice('加载微信读书登录页面失败');
		}
	}

	onClose() {
		this.modal.close();
	}
}

export class WeChatPublicLogoutModal {
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
			this.modal.setTitle('注销微信读书，右上角头像点击退出登录~');
			this.modal.show();
		});
		const session = this.modal.webContents.session;
		const filter = {
			urls: ['https://weread.qq.com/web/logout']
		};
		session.webRequest.onCompleted(filter, (details: HttpDetails) => {
			if (details.statusCode == 200) {
				console.log('weread logout success, clear cookies...');
				settingsStore.actions.clearCookies();
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