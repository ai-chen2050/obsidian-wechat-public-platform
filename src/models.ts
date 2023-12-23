import { TFile } from 'obsidian';

export interface Articles {
    articles: ArticleElement[];
}

export interface ArticleElement {
    title:                 string;
    author:                string;
    digest:                string;
    content:               string;
    content_source_url:    string;
    thumb_media_id:        string;  // cover media ID
    need_open_comment:     number;  
    only_fans_can_comment: number;
}


export interface BatchGetMaterial {
    item:        NewsItem[]|MediaItem[];
    total_count: number;
    item_count:  number;
}

export interface NewsItem {
    media_id:    string;
    content:     ContentRsp;
    update_time: number;
}

export interface ContentRsp {
    news_item:   NewsItemResp[];
    create_time: number;
    update_time: number;
}

export interface NewsItemResp {
    title:                 string;
    author:                string;
    digest:                string;
    content:               string;
    content_source_url:    string;
    thumb_media_id:        string;
    show_cover_pic:        number;
    url:                   string;
    thumb_url:             string;
    need_open_comment:     number;
    only_fans_can_comment: number;
}

export interface MediaItem {
    media_id:    string;
    name:        string;
    update_time: number;
    url:         string;
    tags:        any[];
}

export class MDFrontMatterContent {
	author:                string;
	create_time: 		   string;
	media_id:    		   string;
    url:                   string;
    content_source_url:    string;
    thumb_media_id:        string;
    thumb_url:             string;
};