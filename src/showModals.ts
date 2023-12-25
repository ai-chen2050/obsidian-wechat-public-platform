import { App, Modal, Setting, AbstractInputSuggest, Menu, SuggestModal, TFile} from "obsidian";
import { CoverInfo } from "./models";
class WeChatUploadMaterialModal extends Modal {
    path: string;
    name: string;
    type: string;
    onSubmit: (path: string, type: string, name: string) => void;
  
    constructor(app: App, onSubmit: (path: string, type: string, name: string) => void) {
      super(app);
      this.onSubmit = onSubmit;
    }
  
    onOpen() {
      const { contentEl } = this;
  
      contentEl.createEl("h1", { text: "Input Material Details" });
  
      new Setting(contentEl)
        .setName("Path")
        .setDesc("path: ob path or net url")
        .addText((text) =>
          text.onChange((value) => {
            this.path = value
          }));

      new Setting(contentEl)
        .setName("Type")
        .setDesc("fileType: image, audio, video")
        .addText((text) =>
          text.onChange((value) => {
            this.name = value
          }));

      new Setting(contentEl)
        .setName("Name")
        .setDesc("fileName: to save file name on server, eg: neo.png")
        .addText((text) =>
          text.onChange((value) => {
            this.type = value
          })); 
  
      new Setting(contentEl)
        .addButton((btn) =>
          btn
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
              this.close();
              this.onSubmit(this.path, this.type, this.name);
            }));
    }
  
    onClose() {
      let { contentEl } = this;
      contentEl.empty();
    }
}

class WeChatDownloadMaterialModal extends Modal {
    offset: string;
    totalCount: string;
    type: string;
    onSubmit: (offset: string, type: string, totalCount: string) => void;
  
    constructor(app: App, onSubmit: (offset: string, type: string, totalCount: string) => void) {
      super(app);
      this.onSubmit = onSubmit;
    }
  
    onOpen() {
      const { contentEl } = this;
  
      contentEl.createEl("h1", { text: "Input Download Details" });
  
      new Setting(contentEl)
        .setName("Type")
        .setDesc("type: news, image, video, voice")
        .addText((text) =>
          text.onChange((value) => {
            this.type = value
          })); 

      new Setting(contentEl)
        .setName("Offset")
        .setDesc("offset: start related last log")
        .addText((text) =>
          text.onChange((value) => {
            this.offset = value
          }));

      new Setting(contentEl)
        .setName("TotalCount")
        .setDesc("totalCount: number,maximum 20")
        .addText((text) =>
          text.onChange((value) => {
            this.totalCount = value
          }));

      new Setting(contentEl)
        .addButton((btn) =>
          btn
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
              this.close();
              this.onSubmit(this.offset, this.type, this.totalCount);
            }));
    }
  
    onClose() {
      let { contentEl } = this;
      contentEl.empty();
    }
}

// 打开某个文件
class OpenFileModal extends Modal {
    input: HTMLInputElement;
    file: File;
    onSubmit: (file: File) => Promise<void>;
    constructor(app: App, onSubmit: (file: File) => Promise<void>) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        this.input = contentEl.createEl("input", {
            attr: {
                type: "file"
            }
        });

        this.input.addEventListener("change", () => {
            this.file = this.input.files![0];
        });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText(("Yes"))
                .onClick((evt) => {
                    this.onSubmit(this.file);
                    this.close();
                })
            );
    }

    onClose(): void {

    }
}

// 做某些危险操作前问一句
class WarningModal extends Modal {
    onSubmit: () => Promise<void>;
    message: string;

    constructor(app: App, message: string, onSubmit: () => Promise<void>) {
        super(app);
        this.message = message;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: this.message });

        new Setting(contentEl)
            .addButton((btn) => btn
                .setButtonText("Yes")
                .setWarning()
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit();
                })
            )
            .addButton((btn) => btn
                .setButtonText(("No!!!"))
                .setCta() // what is this?
                .onClick(() => {
                    this.close();
                }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

class CoverIDSuggestModal extends SuggestModal<CoverInfo> {
  content: CoverInfo[];
	query: string;
  onSubmit: (cover: CoverInfo) => void;

  constructor(app: App, content: CoverInfo[],onSubmit: (cover: CoverInfo) => void, limit: number = 20) {
		super(app);
		this.query = "";
		this.limit = limit;
    this.content = content;
    this.onSubmit = onSubmit;
		this.setPlaceholder("请从素材库选择文章封面图片......");
	}

	queryCover(contents: CoverInfo[], query: string, res: CoverInfo[]) {
		for (var i = 0; i < contents.length; i++) {
      const content = contents[i];
			if (content.mediaName.indexOf(query) >= 0) {
					res.push(content);
			}
      if (res.length >= this.limit) {
        return true;
      }
		}

		return false;
	}

	getSuggestions(query: string): CoverInfo[] {
		this.query = query;
		const res: CoverInfo[] = [];
		this.queryCover(this.content, query, res);
		
		return res;
	}

	renderSuggestion(cover: CoverInfo, el: HTMLElement) {
		const title = cover.mediaName;
        
    if (this.query) {
        el.innerHTML = title.replace(RegExp(`(${this.query})`,'g'),`<span class="suggestion-highlight">pic: $1</span>`);
        el.createDiv({text:"id: " + cover.mediaID.substring(0, 30),cls:"suggestion-note"});
    } else {
        el.createSpan({text:"pic: " + title});
        el.createDiv({text:"id: " + cover.mediaID.substring(0, 30),cls:"suggestion-note"});
    }
        
	}

	onChooseSuggestion(item: CoverInfo, evt: MouseEvent | KeyboardEvent) {
			this.onSubmit(item);
	}
}

class FileSuggestModal extends SuggestModal<TFile> {
  content: TFile[];
	query: string;
  onSubmit: (mdFile: TFile) => void;

  constructor(app: App, content: TFile[], onSubmit: (mdFile: TFile) => void) {
		super(app);
		this.query = "";
    this.content = content;
    this.onSubmit = onSubmit;
		this.setPlaceholder("请选择要发送的文章......");
	}

	querymdFile(contents: TFile[], query: string, res: TFile[]) {
		for (var i = 0; i < contents.length; i++) {
      const content = contents[i];
			if (content.basename .indexOf(query) >= 0) {
					res.push(content);
			}
		}

		return false;
	}

	getSuggestions(query: string): TFile[] {
		this.query = query;
		const res: TFile[] = [];
		this.querymdFile(this.content, query, res);
		
		return res;
	}

	renderSuggestion(mdFile: TFile, el: HTMLElement) {
		const title = mdFile.name;
        
    if (this.query) {
        el.innerHTML = title.replace(RegExp(`(${this.query})`,'g'),`<span class="suggestion-highlight">title: $1</span>`);
        el.createDiv({text:"path: " + mdFile.path,cls:"suggestion-note"});
    } else {
        el.createSpan({text:"title: " +  title});
        el.createDiv({text:"path: " + mdFile.path,cls:"suggestion-note"});
    }
        
	}

	onChooseSuggestion(item: TFile, evt: MouseEvent | KeyboardEvent) {
			this.onSubmit(item);
	}
}

class MultiSuggest extends AbstractInputSuggest<string> {
  content: Set<string>;

  constructor(private inputEl: HTMLInputElement, content: Set<string>, private onSelectCb: (value: string) => void, app: App) {
      super(app, inputEl);
      this.content = content;
  }

  getSuggestions(inputStr: string): string[] {
      const lowerCaseInputStr = inputStr.toLocaleLowerCase();
      return [...this.content].filter((content) =>
          content.toLocaleLowerCase().contains(lowerCaseInputStr)
      );
  }

  renderSuggestion(content: string, el: HTMLElement): void {
      el.setText(content);
  }

  selectSuggestion(content: string, evt: MouseEvent | KeyboardEvent): void {
      this.onSelectCb(content);
      this.inputEl.value = "";
      this.inputEl.blur()
      this.close();
  }
}

export { OpenFileModal, WarningModal, WeChatDownloadMaterialModal, WeChatUploadMaterialModal, CoverIDSuggestModal, FileSuggestModal, MultiSuggest };