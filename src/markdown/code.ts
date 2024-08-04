import { marked, Renderer, Token, Tokens, Lexer } from "marked";

const preReg = /<pre><code[\w\s-="]*>/;

export function removeWeChatPreCode() {
    return {
        name: 'WeChatPreCodeRemover',
        level: 'block',
        start(src: string) {
            const index = src.indexOf('<pre><code');
            return index === -1 ? undefined : index;
        },
        tokenizer(src: string, tokens: Token[]) {
            const match = src.match(preReg);
            if (match) {
                const endIndex = src.indexOf('</code></pre>', match.index!);
                if (endIndex !== -1) {
                    return {
                        type: 'WeChatPreCodeRemover',
                        raw: src.slice(match.index!, endIndex + '</code></pre>'.length),
                        pre: match[0],
                        content: src.slice(match.index! + match[0].length, endIndex),
                        post: '</code></pre>',
                    };
                }
            }
        },
        renderer(token: Tokens.Generic) {
            return token.content; // Remove the <pre><code> and </code></pre> tags
        }
    }
}

// 使用示例
// marked.use({ extensions: [removeWeChatPreCode()] });

// 示例转换
// const markdownContent = `
// <pre><code class="language-js">console.log('Hello, world!');</code></pre>
// `;
// const htmlContent = marked(markdownContent);
// console.log(htmlContent); // 输出: console.log('Hello, world!');