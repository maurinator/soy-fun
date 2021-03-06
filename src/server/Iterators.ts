import { TextDocument } from "vscode-languageclient/lib/main";

interface Iterator<SoyToken> {
  next(value?: any): SoyToken;
  peek(value?: any): SoyToken;
  return?(value?: any): SoyToken;
  throw?(e?: any): SoyToken;
}

interface SoyToken {
  name: string,
  contents: string;
  line: number;
  character: number;

  comments?: string;
  params?: string[];
  type: string;
}

abstract class BaseIterator implements Iterator<SoyToken> {
  protected pointer = 0;
  protected tokens: SoyToken[] = [];

  public next(): SoyToken {
    return this.pointer < this.tokens.length ? this.tokens[this.pointer++] : null;
  }

  public peek(): SoyToken {
    return this.pointer < this.tokens.length ? this.tokens[this.pointer] : null;
  }
}

abstract class TokenIterator extends BaseIterator {
  constructor(public data: string, public rgx: RegExp = /({[^{|}]*})/g) {
    super();
    let lines = data.split('\n');
    for (let line of lines) {
      let m;
      let lineIndex = lines.indexOf(line);
      while (m = rgx.exec(line)) {
        let characterIndex = m.index;
        this.tokens = this.tokens.concat({
          name: m[2],          
          contents: m[1],
          line: lineIndex,
          character: characterIndex,
          type: 'generic'
        });
      }
    }
  }
}

export class TemplateIterator extends BaseIterator {
  public rgx: RegExp = /(\/\*{2}\n(\s*\/\/\s*.*\s*|\s*\*\s+.*\n)*\s*\*\/\n)({template\s+(\w+|.*)})|({template\s+(\w+|.*)})/g
  constructor(public data: TextDocument) {
    super();
    let m;
    let strDoc = data.getText();
    while (m = this.rgx.exec(strDoc)) {
      let offset = m.index;      
      let comments = m[1];
      let params: string[] = [];
      if (comments) {
        offset += comments.length;
        let paramRgx = /(\s\*\s+@param\?{0,1}\s+(.*)\n)/g;
        let p;
        while (p = paramRgx.exec(comments)) {
          let paramName = p[2];
          params = params.concat(paramName);
        }
      }
      let position = data.positionAt(offset);
      let contents = m[3];
      let name = m[4] || m[6];
      this.tokens = this.tokens.concat({
        name: name,
        contents: contents,
        line: position.line,
        character: position.character,
        comments: comments,
        params: params,
        type: 'template'
      });
    }
  }
}

export class CallIterator extends TokenIterator {
  constructor(public data: string) {
    super(data, /({\/*call\s*([^{|}|\s]*)\s*[^{|}]*\/{0,1}})/g);
  }
}

export class NamespaceIterator extends TokenIterator {
  constructor(public data: string) {
    super(data, /({namespace\s+([^{|}|\s]*)\s*[^{|}]*})/g);
  }
}