import { writable } from 'svelte/store';
import WeChatPublic from '../main';

interface WechatPublicPluginSettings {
	appid: string;
	secret: string;
	accessToken: string;
	lastAccessKeyTime: number
	isTokenValid: boolean;
	downloadFolder: string;	// for automatic release using, wechat article save folder
	youtubeSaveFolder: string;	// youtube video save folder
	noteLocationFolder: string;	// for automatic release using
	BlacklistFolder: string;
	ProxyIP: string;	// proxy IP for download youtube
	VideoResolution: string;	// video resolution
}

const DEFAULT_SETTINGS: WechatPublicPluginSettings = {
	appid: '',
	secret: '',
	accessToken: '',
	lastAccessKeyTime: -1,
	isTokenValid: false,
	downloadFolder: '',
	youtubeSaveFolder: '',
	noteLocationFolder: '',
	BlacklistFolder: '',
	ProxyIP: '',
	VideoResolution: '',
};

const createSettingsStore = () => {
	const store = writable(DEFAULT_SETTINGS as WechatPublicPluginSettings);

	let _plugin!: WeChatPublic;

	const initialise = async (plugin: WeChatPublic): Promise<void> => {
		const data = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());
		const settings: WechatPublicPluginSettings = { ...data };
		console.log('--------init get access token------');
		if (settings.accessToken !== '') {
			setAccessToken(settings.accessToken);
		} else {
			console.log("appid " + settings.appid + " ,secret " + settings.secret);
			setAppId(settings.appid);
			setSecret(settings.secret);
		}

		store.set(settings);
		_plugin = plugin;
	};

	store.subscribe(async (settings) => {
		if (_plugin) {
			const data = {
				...settings
			};
			await _plugin.saveData(data);
		}
	});

	const clearSecret = () => {
		console.log('[wechat Public plugin] clear secret and exit.');
		store.update((state) => {
			state.accessToken = '';
			state.lastAccessKeyTime = new Date().getTime();
			state.appid = '';
			state.secret = '';
			state.isTokenValid = false;
			return state;
		});
	};

	const setAccessToken = (accessToken: string) => {
		store.update((state) => {
			state.accessToken = accessToken;
			state.lastAccessKeyTime = new Date().getTime();
			state.isTokenValid = true;
			return state;
		});
	};

	const setAppId = (appId: string) => {
		store.update((state) => {
			state.appid = appId;
			return state;
		});
	};

	const setSecret = (secret: string) => {
		store.update((state) => {
			state.secret = secret;
			return state;
		});
	};

	const setNoteLocationFolder = (value: string) => {
		store.update((state) => {
			state.noteLocationFolder = value;
			return state;
		});
	};
	
	const setDownloadFolder = (value: string) => {
		store.update((state) => {
			state.downloadFolder = value;
			return state;
		});
	};

	const setYoutubeSaveFolder = (value: string) => {
		store.update((state) => {
			state.youtubeSaveFolder = value;
			return state;
		});
	};
	
	const setBlacklistFolder = (notebookBlacklist: string) => {
		store.update((state) => {
			state.BlacklistFolder = notebookBlacklist;
			return state;
		});
	};

	const setProxyIP = (ProxyIP: string) => {
		store.update((state) => {
			state.ProxyIP = ProxyIP;
			return state;
		});
	};

	const setVideoResolution = (Resolution: string) => {
		store.update((state) => {
			state.VideoResolution = Resolution;
			return state;
		});
	};

	return {
		subscribe: store.subscribe,
		initialise,
		actions: {
			setNoteLocationFolder,
			setDownloadFolder,
			setAccessToken,
			setAppId,
			setSecret,
			clearSecret,
			setBlacklistFolder,
			setYoutubeSaveFolder,
			setProxyIP,
			setVideoResolution,
		}
	};
};

export const settingsStore = createSettingsStore();
