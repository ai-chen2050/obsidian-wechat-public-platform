import { App, Notice, PluginSettingTab, Setting, TFolder } from "obsidian";
import WeChatPublic from "../main";
import { settingsStore } from "./settings";
import ApiManager from "./api";
import { get } from "svelte/store";
import pickBy from "lodash.pickby";
import { BjhLoginModel } from "./LoginModas";
import { buyMeACoffee, commutity, motivation } from "./consts/global";

export class WeChatPublicSettingTab extends PluginSettingTab {
	plugin: WeChatPublic;
	private apiManager: ApiManager;
	readonly expireDuration: number = 7200;

	constructor(app: App, plugin: WeChatPublic, apiManeger: ApiManager) {
		super(app, plugin);
		this.plugin = plugin;
		this.apiManager = apiManeger;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		new Setting(containerEl)
			.setName("🌈 Wechat public platform")
			.setHeading();
		if (
			get(settingsStore).lastAccessKeyTime + this.expireDuration <
			new Date().getTime()
		) {
			this.showWxLogin();
		} else {
			this.showWxLogout();
		}

		this.setAppId();
		this.setSecret();
		this.setDownloadFolder();
		this.setBlacklist();
		this.setNoteLocationFolder();

		new Setting(containerEl)
			.setName("🌎 🌞 Baidu bjh platform 🔍")
			.setHeading();
		if (get(settingsStore).BjhCookie === "") {
			this.showBJHLogin();
		} else {
			this.showBJHLogout();
		}

		this.donation(containerEl);
	}

	private showWxLogout(): void {
		document.createRange().createContextualFragment;
		const desc = document
			.createRange()
			.createContextualFragment(
				`If you want to clean secret,please click at clean secret`
			);

		new Setting(this.containerEl)
			.setName(
				`Wechat platform haved login, APP-ID: ${
					get(settingsStore).appid
				}`
			)
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText("Clean secret")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						settingsStore.actions.clearSecret();
						this.display();
					});
			})
			.addButton((button) => {
				return button
					.setButtonText("Copy access key")
					.setCta()
					.onClick(async () => {
						const accesskey = get(settingsStore).accessToken;
						navigator.clipboard.writeText(accesskey).then(
							function () {
								new Notice(
									"Copy access-key to clipboard succeed!"
								);
							},
							function (error) {
								new Notice(
									"Copy access-key to clipboard failed!"
								);
								console.error(
									"Copy access-key to clipboard failed!",
									error
								);
							}
						);
					});
			});
	}

	private showWxLogin(): void {
		const desc = document
			.createRange()
			.createContextualFragment(
				`Before the test, enter [appid] and [secretkey], and contact the administrator to whitelist your external IP address. https://tool.lu/ip/`
			);

		new Setting(this.containerEl)
			.setName("Test the wechat public API")
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText("Connect")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						// reqest access token key
						await this.apiManager.refreshAccessToken(
							get(settingsStore).appid,
							get(settingsStore).secret
						);
						this.display();
					});
			});
	}

	private showBJHLogin(): void {
		new Setting(this.containerEl)
			.setName("Login bjh platform")
			.addButton((button) => {
				return button
					.setButtonText("Login")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						const loginModel = new BjhLoginModel(this);
						await loginModel.doLogin();
						this.display();
					});
			});
	}

	private showBJHLogout(): void {
		document.createRange().createContextualFragment;
		const desc = document
			.createRange()
			.createContextualFragment(
				`If you want to clean cookie & exit,please click at clean cookie`
			);

		new Setting(this.containerEl)
			.setName(
				`Bjh platform haved logined: [ ${
					get(settingsStore).BjhUserName
				} ]`
			)
			.setDesc(desc)
			.addButton((button) => {
				return button
					.setButtonText("Clean cookie")
					.setCta()
					.onClick(async () => {
						button.setDisabled(true);
						settingsStore.actions.clearBjhCookie();
						this.display();
					});
			})
			.addButton((button) => {
				return button
					.setButtonText("Copy cookie")
					.setCta()
					.onClick(async () => {
						const bjhCookie = get(settingsStore).BjhCookie;
						navigator.clipboard.writeText(bjhCookie).then(
							function () {
								new Notice("Copy cookie to clipboard succeed!");
							},
							function (error) {
								new Notice("Copy cookie to clipboard failed!");
								console.error(
									"Copy cookie to clipboard failed!",
									error
								);
							}
						);
					});
			});
	}

	private setAppId(): void {
		new Setting(this.containerEl)
			.setName("Setting appid")
			.setDesc("wechat public platform account appid")
			.addText((text) =>
				text
					.setPlaceholder("Enter your appid")
					.setValue(get(settingsStore).appid)
					.onChange(async (value) => {
						settingsStore.actions.setAppId(value);
					})
			);
	}

	private setSecret(): void {
		new Setting(this.containerEl)
			.setName("Setting secret")
			.setDesc("wechat public platform account secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(get(settingsStore).secret)
					.onChange(async (value) => {
						settingsStore.actions.setSecret(value);
					})
			);
	}

	private setNoteLocationFolder(): void {
		new Setting(this.containerEl)
			.setName("Note location folder")
			.setDesc("for future using")
			.addText((input) => {
				input
					.setPlaceholder("ur wechat release folder")
					.setValue(get(settingsStore).noteLocationFolder)
					.onChange((value: string) => {
						settingsStore.actions.setNoteLocationFolder(value);
					});
			});
	}

	private setDownloadFolder(): void {
		new Setting(this.containerEl)
			.setName("Download folder")
			.setDesc("Download folder from wechat public")
			.addDropdown((dropdown) => {
				const files = this.app.vault.getAllLoadedFiles();
				const folders = pickBy(files, (val: any) => {
					return val instanceof TFolder;
				});

				Object.values(folders).forEach((val: TFolder) => {
					dropdown.addOption(val.path, val.path);
				});

				return dropdown
					.setValue(get(settingsStore).downloadFolder)
					.onChange(async (value) => {
						settingsStore.actions.setDownloadFolder(value);
					});
			});
	}

	private setYoutubeSaveFolder(): void {
		new Setting(this.containerEl)
			.setName("Youtube save folder")
			.setDesc("Download folder from youtube")
			.addDropdown((dropdown) => {
				const files = this.app.vault.getAllLoadedFiles();
				const folders = pickBy(files, (val: any) => {
					return val instanceof TFolder;
				});

				Object.values(folders).forEach((val: TFolder) => {
					dropdown.addOption(val.path, val.path);
				});
				return dropdown
					.setValue(get(settingsStore).youtubeSaveFolder)
					.onChange(async (value) => {
						settingsStore.actions.setYoutubeSaveFolder(value);
					});
			});
	}

	private setBlacklist(): void {
		new Setting(this.containerEl)
			.setName("Blacklist")
			.setDesc("Prohibit upload folders, use comma apart")
			.addText((input) => {
				input
					.setPlaceholder("/self,/key,/secret")
					.setValue(get(settingsStore).BlacklistFolder)
					.onChange((value: string) => {
						settingsStore.actions.setBlacklistFolder(value);
					});
			});
	}

	private setProxyIP(): void {
		new Setting(this.containerEl)
			.setName("ProxyIP")
			.setDesc("Proxy IP, proxy ip for download youtube video")
			.addText((input) => {
				input
					.setPlaceholder("http://user:pass@111.111.111.111:8080")
					.setValue(get(settingsStore).ProxyIP)
					.onChange((value: string) => {
						settingsStore.actions.setProxyIP(value);
					});
			});
	}

	private donation(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("💰 Support & Funding 💰")
			.setHeading();
		containerEl.createEl("br");
		let div = containerEl.createEl("div");

		const donateText = document.createElement("p");
		donateText.appendText(
			"If this plugin adds value for you and you would like to help support " +
				"continued development, please use the buttons below:"
		);
		donateText.style.textAlign = "center";
		donateText.style.width = "70%";
		donateText.style.margin = "0 auto";
		div.appendChild(donateText);
		div = this.createDonateQRC(div);

		div.appendChild(containerEl.createEl("br"));
		const donateTextZH = document.createElement("p");
		donateTextZH.appendText(
			"如果您觉得这个插件帮助到您了，为您提供了价值，欢迎赞助我以持续开发迭代本插件。" +
				"您可以使用如下微信/ WeChat 二维码以赞助开发者: 🧡🧡 👏🏻👏🏻"
		);
		donateTextZH.style.textAlign = "center";
		donateTextZH.style.width = "70%";
		donateTextZH.style.margin = "0 auto";
		div.appendChild(donateTextZH);

		div.appendChild(containerEl.createEl("br"));
		const parser = new DOMParser();

		//   div.appendChild(
		// 	this.createDonateButton(
		// 	  'https://paypal.me/blakechan',
		// 	  parser.parseFromString(paypal, 'text/xml').documentElement,
		// 	),
		//   );

		div.appendChild(
			this.createDonateButton(
				"https://www.buymeacoffee.com/blakechan",
				parser.parseFromString(buyMeACoffee, "text/xml").documentElement
			)
		);
	}

	private createDonateButton(link: string, img: HTMLElement): HTMLElement {
		const a = document.createElement("a");
		a.setAttribute("href", link);
		a.style.margin = "40%";
		a.appendChild(img);
		return a;
	}

	private createDonateQRC(div: HTMLDivElement): HTMLDivElement {
		const table = document.createElement("table");
		// 创建第一行
		const row1 = document.createElement("tr");

		// 创建第一个单元格
		const cell1 = document.createElement("td");
		const text1 = document.createElement("p");
		cell1.appendChild(text1);
		row1.appendChild(cell1);

		// 创建第二个单元格
		const cell2 = document.createElement("td");
		const text2 = document.createElement("p");
		cell2.appendChild(text2);
		row1.appendChild(cell2);

		// 创建第二行
		const row2 = document.createElement("tr");

		// 创建第三个单元格并添加第三张图片
		const cell3 = document.createElement("td");
		const img3 = document.createElement("img");
		img3.src = motivation;
		img3.style.width = "200px";
		img3.style.height = "auto";
		img3.style.margin = "0 10px";
		cell3.appendChild(img3);
		row2.appendChild(cell3);

		// 创建第四个单元格并添加第四张图片
		const cell4 = document.createElement("td");
		const img4 = document.createElement("img");
		img4.src = commutity;
		img4.style.width = "200px";
		img4.style.height = "auto";
		img4.style.margin = "0 10px";
		cell4.appendChild(img4);
		row2.appendChild(cell4);

		table.appendChild(row1);
		table.appendChild(row2);

		table.style.margin = "0 auto";
		div.appendChild(table);
		return div;
	}
}
