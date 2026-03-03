import fs from "fs";
import path from "path";
import { CliConfig } from "./types";

const CONFIG_FILENAMES = ["wechat-public.config.json", ".wechat-public.json"];

const envOr = (value: string | undefined, fallback?: string) => {
	if (value !== undefined && value !== "") {
		return value;
	}
	return fallback;
};

const loadJsonFile = (filePath: string): CliConfig | undefined => {
	if (!fs.existsSync(filePath)) {
		return undefined;
	}
	const raw = fs.readFileSync(filePath, "utf-8");
	return JSON.parse(raw) as CliConfig;
};

const findConfigPath = (explicitPath?: string): string | undefined => {
	if (explicitPath) {
		return explicitPath;
	}
	const envPath = process.env.WECHAT_PUBLIC_CONFIG;
	if (envPath) {
		return envPath;
	}
	const cwd = process.cwd();
	for (const name of CONFIG_FILENAMES) {
		const candidate = path.join(cwd, name);
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return undefined;
};

export const loadConfig = (
	explicitPath?: string,
): { config: CliConfig; path?: string } => {
	const configPath = findConfigPath(explicitPath);
	const fileConfig = configPath ? loadJsonFile(configPath) : undefined;

	const config: CliConfig = {
		wechat: {
			appid: envOr(process.env.WECHAT_APPID, fileConfig?.wechat?.appid),
			secret: envOr(
				process.env.WECHAT_SECRET,
				fileConfig?.wechat?.secret,
			),
			accessToken: envOr(
				process.env.WECHAT_ACCESS_TOKEN,
				fileConfig?.wechat?.accessToken,
			),
		},
		baidu: {
			cookie: envOr(process.env.BJH_COOKIE, fileConfig?.baidu?.cookie),
			token: envOr(process.env.BJH_TOKEN, fileConfig?.baidu?.token),
			appId: envOr(process.env.BJH_APP_ID, fileConfig?.baidu?.appId),
			userName: envOr(
				process.env.BJH_USER_NAME,
				fileConfig?.baidu?.userName,
			),
		},
		paths: {
			customCss: envOr(
				process.env.WECHAT_CUSTOM_CSS,
				fileConfig?.paths?.customCss,
			),
			downloadDir: envOr(
				process.env.WECHAT_DOWNLOAD_DIR,
				fileConfig?.paths?.downloadDir,
			),
		},
	};

	return { config, path: configPath };
};
