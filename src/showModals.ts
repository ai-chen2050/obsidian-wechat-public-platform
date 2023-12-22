import { App, Modal, Setting } from "obsidian";

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
        .setName("Name")
        .setDesc("fileType: image, audio, video")
        .addText((text) =>
          text.onChange((value) => {
            this.name = value
          }));

      new Setting(contentEl)
        .setName("Type")
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

class TestModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
		// contentEl.set
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export { OpenFileModal, WarningModal, TestModal, WeChatUploadMaterialModal };