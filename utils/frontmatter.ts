import { App, TFile } from "obsidian";

export class FrontMatterManager {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    async removeFrontMatter(file: TFile): Promise<string> {
        let text = await this.app.vault.read(file);
        let ret = text.replace(/---[\s\S]*?---/, "");
        return ret;
    }
}