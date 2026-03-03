---
name: wechat-public-cli
description: Publish and download WeChat Public Platform content and Baijiahao articles via a local CLI.
homepage: https://github.com/ai-chen2050/obsidian-wechat-public-platform
metadata:
    {
        "openclaw":
            {
                "emoji": "📰",
                "requires": { "bins": ["wechat-public-cli"] },
                "install":
                    [
                        {
                            "id": "npm",
                            "kind": "shell",
                            "label": "Install wechat-public-cli (npm)",
                            "command": "npm install -g wechat-public-cli",
                        },
                        {
                            "id": "git",
                            "kind": "shell",
                            "label": "Clone repo and install dependencies",
                            "command": "git clone https://github.com/ai-chen2050/obsidian-wechat-public-platform.git && cd obsidian-wechat-public-platform && npm install",
                        },
                    ],
            },
    }
---

# Wechat Public CLI Skill

## Goal

Publish an Obsidian markdown article to WeChat Public Platform or Baidu Baijiahao using a local CLI.

## Requirements

- Node.js 16+
- Config file or environment variables for credentials
- Markdown file with frontmatter (author, digest, banner or banner_path, thumb_media_id optional)

## Install

```bash
git clone https://github.com/ai-chen2050/obsidian-wechat-public-platform.git
cd obsidian-wechat-public-platform
npm install

Or by clawdhub
claw install wechat-public-cli
```

Or install globally via npm:

```bash
npm install -g wechat-public-cli
```

If this CLI is published to npm, you can run it via npx without cloning:

```bash
npx wechat-public-cli wechat:draft --file /path/to/article.md
```

## Config

Create a JSON file in the repo root named `wechat-public.config.json`:

```json
{
	"wechat": {
		"appid": "YOUR_APP_ID",
		"secret": "YOUR_APP_SECRET",
		"accessToken": ""
	},
	"baidu": {
		"cookie": "YOUR_BJH_COOKIE",
		"token": "YOUR_BJH_TOKEN",
		"appId": "YOUR_BJH_APP_ID"
	},
	"paths": {
		"customCss": "./custom.css",
		"downloadDir": "./wechat-downloads"
	}
}
```

Env override:

- `WECHAT_APPID`, `WECHAT_SECRET`, `WECHAT_ACCESS_TOKEN`
- `BJH_COOKIE`, `BJH_TOKEN`, `BJH_APP_ID`
- `WECHAT_CUSTOM_CSS`, `WECHAT_PUBLIC_CONFIG`
- `WECHAT_DOWNLOAD_DIR`

## Build

```bash
npm run build:cli
```

## Commands

- Create WeChat draft:
    ```bash
    wechat-public-cli wechat:draft --file /path/to/article.md
    ```
- Publish WeChat (from file):
    ```bash
    wechat-public-cli wechat:publish --file /path/to/article.md
    ```
- Publish WeChat (from media_id):
    ```bash
    wechat-public-cli wechat:publish --media-id YOUR_MEDIA_ID
    ```
- Send to all WeChat followers:
    ```bash
    wechat-public-cli wechat:sendall --file /path/to/article.md
    ```
- Publish Baijiahao:
    ```bash
    wechat-public-cli bjh:publish --file /path/to/article.md
    ```
- Convert markdown to HTML:
    ```bash
    wechat-public-cli convert --file /path/to/article.md --platform wechat
    ```
- Download recent N WeChat articles:
    ```bash
    wechat-public-cli wechat:download --count 10 --out-dir ./wechat-downloads
    ```

## Notes

- WeChat draft requires `thumb_media_id` or `banner`/`banner_path` in frontmatter.
- Baijiahao publish requires `banner` or `banner_path` in frontmatter.
- The CLI uploads inline images to the target platform automatically.
- `wechat:download` saves recent articles in update_time order and writes all `news_item` entries.
