
# Wechat public API


<!--- If we have only one group/collection, then no need for the "ungrouped" heading -->
- [Wechat public API](#wechat-public-api)
  - [Endpoints](#endpoints)
    - [1. submit](#1-submit)
    - [2. getmartiralList](#2-getmartirallist)
    - [3. NewDraft](#3-newdraft)
    - [4. AccessToken](#4-accesstoken)



## Endpoints


--------



### 1. submit



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: https://api.weixin.qq.com/cgi-bin/freepublish/submit
```



***Query params:***

| Key | Value | Description |
| --- | ------|-------------|
| access_token | ACCESS_TOKEN |  |



***Body:***

```js        
{
    "media_id": "MEDIA_ID"
}
```



### 2. getmartiralList



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: https://api.weixin.qq.com/cgi-bin/material/batchget_material
```



***Query params:***

| Key | Value | Description |
| --- | ------|-------------|
| access_token | access token string |  |



***Body:***

```js        
{
    "type":"image",
    "offset":0,
    "count":3
}
```



### 3. NewDraft



***Endpoint:***

```bash
Method: POST
Type: RAW
URL: https://api.weixin.qq.com/cgi-bin/draft/add
```



***Query params:***

| Key | Value | Description |
| --- | ------|-------------|
| access_token | access token string |  |



***Body:***

```js        
{
    "articles": [
        {
            "title":"API Test",
            "author":"ai-chen2050",
            "digest":"DIGEST",
            "content":"<h1>TEST</h1> \n hello,world",
            "content_source_url":"www.baidu.com",
            "thumb_media_id":"awM_2hMypzpKEBfvr0B09Kzv66Ie2wfZVYYq4RJd9jDb_V9ECFWWm7037axPio_M",
            "need_open_comment":0,
            "only_fans_can_comment":0
        }
    ]
}
```



### 4. AccessToken



***Endpoint:***

```bash
Method: GET
Type: 
URL: https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=&secret
```


---
[Back to top](#)

>Generated at 2023-12-20 11:43:26 by [docgen](https://github.com/thedevsaddam/docgen)
