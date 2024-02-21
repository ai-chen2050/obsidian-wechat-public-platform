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
  
      contentEl.createEl("h1", { text: "Input material details" });
  
      new Setting(contentEl)
        .setName("Path")
        .setDesc("path: ob path or net url")
        .addText((text) =>
          text.onChange((value) => {
            this.path = value
          }));

      new Setting(contentEl)
        .setName("Type")
        .setDesc("fileType: image, voice, video, thumb")
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
  
      contentEl.createEl("h1", { text: "Input download details" });
  
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

class YoutubeDownloadModal extends Modal {
    videoUrl: string;
    name: string;
    onSubmit: (videoUrl: string, name: string) => void;
  
    constructor(app: App, onSubmit: (videoUrl: string, name: string) => void) {
      super(app);
      this.onSubmit = onSubmit;
    }
  
    onOpen() {
      const { contentEl } = this;
  
      contentEl.createEl("h1", { text: "Input youtube video source" });
      
      new Setting(contentEl)
        .setName("video url")
        .setDesc("video-url: youtube video url")
        .addText((text) =>
          text.onChange((value) => {
            this.videoUrl = value
          }));

      new Setting(contentEl)
        .setName("video name")
        .setDesc("video-name: youtube video name")
        .addText((text) =>
          text.onChange((value) => {
            this.name = value
          }));

      new Setting(contentEl)
        .addButton((btn) =>
          btn
            .setButtonText("Submit")
            .setCta()
            .onClick(() => {
              this.close();
              this.onSubmit(this.videoUrl, this.name);
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
		for (let i = 0; i < contents.length; i++) {
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
      
      while (el.firstChild) {
          el.removeChild(el.firstChild);
      }
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = "pic: " + title;
      if (this.query) {
          const queryRegExp = new RegExp(`(${this.query})`, 'g');
          const highlightedTitle = title.replace(queryRegExp, '<span class="suggestion-highlight">pic: $1</span>');
          titleSpan.innerHTML = highlightedTitle;
      }
      el.appendChild(titleSpan);
      
      const idDiv = document.createElement('div');
      idDiv.textContent = "id: " + cover.mediaID.substring(0, 30);
      idDiv.classList.add("suggestion-note");
      el.appendChild(idDiv);
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
		for (let i = 0; i < contents.length; i++) {
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
      
      while (el.firstChild) {
          el.removeChild(el.firstChild);
      }
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = "title: " + title;
      if (this.query) {
          const queryRegExp = new RegExp(`(${this.query})`, 'g');
          const highlightedTitle = title.replace(queryRegExp, '<span class="suggestion-highlight">title: $1</span>');
          titleSpan.innerHTML = highlightedTitle;
      }
      el.appendChild(titleSpan);
      
      const pathDiv = document.createElement('div');
      pathDiv.textContent = "path: " + mdFile.path;
      pathDiv.classList.add("suggestion-note");
      el.appendChild(pathDiv);
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

export { OpenFileModal, WarningModal, WeChatDownloadMaterialModal, WeChatUploadMaterialModal, CoverIDSuggestModal, YoutubeDownloadModal, FileSuggestModal, MultiSuggest };