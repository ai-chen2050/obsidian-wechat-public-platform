import { marked } from "marked";
import juice from "juice";
import { markedParse, ParseOptions } from "../markdown/parse";
import { basicStyle } from "../style/basicStyle";
import { wechatFormat } from "../style/wechatFormat";
import { codeStyle } from "../style/codeStyle";
import { calloutStyle } from "../style/callouts";

const inlineHtml = (html: string, customCss: string): string => {
	return juice.inlineContent(
		html,
		basicStyle + wechatFormat + codeStyle + calloutStyle + customCss,
		{
			inlinePseudoElements: true,
			preserveImportant: true,
		},
	);
};

export const formatCodeHTML = (html: string): string => {
	const formattedHTML = html.replace(
		/(<code[^>]*>)(.*?)<\/code>/gs,
		(match, p1, p2) => {
			let replacedCode = "";
			const lines = p2.split("\n");
			for (let i = 0; i < lines.length - 1; i++) {
				replacedCode += p1 + lines[i] + "</code>";
			}
			return p1 + replacedCode;
		},
	);

	return formattedHTML;
};

export const renderWechatHtml = async (
	markdown: string,
	customCss: string,
): Promise<string> => {
	const parseOptions: ParseOptions = {
		lineNumber: true,
		linkStyle: "footnote",
	};
	const htmlText = await markedParse(markdown, parseOptions, []);
	const inlined = inlineHtml(
		`<section id="nice">${htmlText}</section>`,
		customCss,
	);
	return inlined.replace(/[\r\n]/g, "");
};

export const renderBjhHtml = async (
	markdown: string,
	customCss: string,
): Promise<string> => {
	const htmlText = await marked.parse(markdown);
	const formatted = formatCodeHTML(htmlText);
	return inlineHtml(`<section id="nice">${formatted}</section>`, customCss);
};
