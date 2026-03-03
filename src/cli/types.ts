export type WechatConfig = {
	appid?: string;
	secret?: string;
	accessToken?: string;
};

export type BaiduConfig = {
	cookie?: string;
	token?: string;
	appId?: string;
	userName?: string;
};

export type PathsConfig = {
	customCss?: string;
	downloadDir?: string;
};

export type CliConfig = {
	wechat?: WechatConfig;
	baidu?: BaiduConfig;
	paths?: PathsConfig;
};

export type FrontmatterData = Record<string, string | number | boolean>;
