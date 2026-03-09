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

## Article Template

---

title: "Test"
author: Blake
digest: Short summary
banner: "https://image.png"
---

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
    # 使用自定义 CSS
    wechat-public-cli wechat:draft --file /path/to/article.md --css /path/to/tech.css
    ```
- Publish WeChat (from file):
    ```bash
    wechat-public-cli wechat:publish --file /path/to/article.md
    # 使用自定义 CSS
    wechat-public-cli wechat:publish --file /path/to/article.md --css /path/to/business.css
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
    # 使用自定义 CSS
    wechat-public-cli bjh:publish --file /path/to/article.md --css /path/to/custom.css
    ```
- Convert markdown to HTML:
    ```bash
    wechat-public-cli convert --file /path/to/article.md --platform wechat
    # 使用自定义 CSS
    wechat-public-cli convert --file /path/to/article.md --platform wechat --css /path/to/style.css
    ```
- Download recent N WeChat articles:
    ```bash
    wechat-public-cli wechat:download --count 10 --out-dir ./wechat-downloads
    ```

### 使用自定义 CSS 样式

所有发布命令都支持通过 `--css` 参数指定自定义样式文件：

```bash
# 使用技术类文章样式
wechat-public-cli wechat:draft --file tech-article.md --css ./styles/tech.css

# 使用营销类文章样式
wechat-public-cli wechat:publish --file marketing.md --css ./styles/marketing.css

# 使用教程类文章样式
wechat-public-cli bjh:publish --file tutorial.md --css ./styles/tutorial.css
```

## 自定义公众号格式

你可以通过定义和修改 CSS 文件，来调整发布到微信公众号的文章样式。支持为不同类型的文章使用不同的样式文件。

### CSS 文件加载优先级

1. **命令行参数** `--css` （最高优先级）
2. **配置文件** `wechat-public.config.json` 中的 `paths.customCss`
3. **默认文件** 当前目录下的 `custom.css`
4. **空样式** 如果以上都不存在，则不应用自定义样式

### 使用场景示例

#### 1. 使用默认样式

在项目根目录创建 `custom.css`，不传任何参数时自动使用：

```bash
wechat-public-cli wechat:publish --file article.md
```

#### 2. 为不同类型文章使用不同样式

创建多个 CSS 文件，通过 `--css` 参数指定：

```bash
# 技术类文章使用 tech.css
wechat-public-cli wechat:publish --file tech-article.md --css ./styles/tech.css

# 商业类文章使用 business.css
wechat-public-cli wechat:publish --file business-article.md --css ./styles/business.css

# 教程类文章使用 tutorial.css
wechat-public-cli wechat:publish --file tutorial.md --css ./styles/tutorial.css
```

#### 3. 在配置文件中指定默认样式

在 `wechat-public.config.json` 的 `paths.customCss` 字段指定默认样式文件路径：

```json
{
	"paths": {
		"customCss": "./styles/default.css"
	}
}
```

这样不传 `--css` 参数时，会使用配置文件中指定的样式。

### CSS 示例

```css
/* tech.css - 技术文章样式 */
.wechat-title {
	font-size: 2em;
	color: #2c3e50;
	font-family: "Monaco", "Consolas", monospace;
}
.wechat-banner {
	border-radius: 8px;
}
code {
	background-color: #f4f4f4;
	padding: 2px 4px;
}

/* business.css - 商业文章样式 */
.wechat-title {
	font-size: 2.2em;
	color: #c7254e;
	font-family: "Arial", "Helvetica", sans-serif;
}
```

AI 也可通过自动生成或修改 CSS 文件，实现对公众号内容格式的智能优化。

## Notes

- WeChat draft requires `thumb_media_id` or `banner`/`banner_path` in frontmatter.
- Baijiahao publish requires `banner` or `banner_path` in frontmatter.
- The CLI uploads inline images to the target platform automatically.
- `wechat:download` saves recent articles in update_time order and writes all `news_item` entries.
