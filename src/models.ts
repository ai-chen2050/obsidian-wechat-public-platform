import { TFile } from 'obsidian';

export type Chapter = {
	chapterUid: number;
	chapterIdx: number;
	updateTime: number;
	title: string;
	isMPChapter: number;
	level: number;
};

export type ChapterResponse = {
	data: {
		bookId: string;
		chapterUpdateTime: number;
		updated: Chapter[];
	}[];
};

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
