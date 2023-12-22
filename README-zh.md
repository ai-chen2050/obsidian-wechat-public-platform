# Obsidian Wechat Public Plugin

[![](https://github.com/ai-chen2050/obsidian-wechat-public-platform/actions/workflows/CI.yml/badge.svg)](https://github.com/ai-chen2050/obsidian-wechat-public-platform/actions/workflows/CI.yml)
[![Release Obsidian plugin](https://github.com/ai-chen2050/obsidian-wechat-public-platform/actions/workflows/release.yml/badge.svg)](https://github.com/ai-chen2050/obsidian-wechat-public-platform/actions/workflows/release.yml)
[![GitHub license](https://badgen.net/github/license/Naereen/Strapdown.js)](https://github.com/ai-chen2050/obsidian-wechat-public-platform/blob/main/LICENSE)
[![Github all releases](https://img.shields.io/github/downloads/ai-chen2050/obsidian-wechat-public-platform/total.svg)](https://GitHub.com/ai-chen2050/obsidian-wechat-public-platform/releases/)
[![GitLab latest release](https://badgen.net/github/release/ai-chen2050/obsidian-wechat-public-platform/)](https://github.com/ai-chen2050/obsidian-wechat-public-platform/releases)

[EN](./README.md)

黑曜石微信公众平台插件是黑曜石社区插件，用于将黑曜石中的文章或视频等资源发布到微信公众号。

## 发布历史
https://github.com/ai-chen2050/obsidian-wechat-public-platform/releases

## 功能及命令

- [ upload material on WeChatPublic ]【微信公众号上传素材】将资源图片、视频上传至微信公众号资源管理（等待黑曜石支持formdata体）
- [ add draft on WeChatPublic ]【微信公众平台添加草稿】微信公众平台草稿箱添加图文资源
- [ Release article on WeChatPublic ]【微信公众号发布文章】发布图文消息及各类资源并发布到微信公众平台
- [ Send all fees on WeChatPublic ]【微信公众号发送所有费用】给粉丝群发消息（注：需要认证有通话权限）

![commands](./public/commands.png)
![uploadMateial](./public/uploadMateial.png)

## 安装

直接在插件市场搜索“微信公众号”，找到“微信公众号插件”，点击“安装”进行安装。 安装完成后，点击“启用”即可启用插件。 

或者下载源码编译成 main.js 和 manifest.json 放到插件目录下的.obsidian下，然后Enable。

## 使用

### 文章属性字段

- 建议使用以下要发布的文章的 frontmatter。 该插件将使用以下字段

```yaml
author: Blake   // for article author
thumb_media_id: "awM_2hMypzpKEBfvr0B09MPmBahsXrBzBhNAzIPXHzRYGjzErk7ZBs4L8nL7VpEY" // media id in wechat platform
banner: "https://images.unsplash.com/photo-1620266757065-5814239881fd?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=2400"
banner_path: "twitter.jpg"  // image file path
open_comment: 0
source_url: ""  // ref article url source
digest: ""
```

- 文章封面：微信公众平台内部资源thumb_media_id优先级最高时，其次是网络图片banner，最后是黑曜石本地图片路径
- 其他字段填写微信公众平台发表文章的相关信息。


## Wechat public API
[Wechat API](./docs/wepublic.md)

## Support & Funding

<img src="./public/wechat-motion-qr.png" alt="wechat-motion-qr" width="300" height="300">

<div align="right">
<a href="https://www.buymeacoffee.com/blakechan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-violet.png" alt="Buy Me A Coffee" style="height: 45px !important;width: 140px !important;" ></a>
</div>



## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=ai-chen2050/obsidian-wechat-public-platform&type=Date)](https://star-history.com/#ai-chen2050/obsidian-wechat-public-platform&Date)

