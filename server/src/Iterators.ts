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
}

abstract class BaseTokenIterator implements Iterator<SoyToken> {
  private pointer = 0;
  private tokens: SoyToken[] = [];
  
  constructor(public data: string, public rgx: RegExp = /({[^{|}]*})/g) {
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
          character: characterIndex
        });
      }
    }
  }

  public next(): SoyToken {
    return this.pointer < this.tokens.length ? this.tokens[this.pointer++] : null;
  }

  public peek(): SoyToken {
    return this.pointer < this.tokens.length ? this.tokens[this.pointer] : null;
  }
}

export class TemplateIterator extends BaseTokenIterator {
  constructor(public data: string, public rgx: RegExp = /({template\s*([^{|}|\s]*)\s*[^{|}]*})/g) {
    super(data, rgx);
  }
}

export class CallIterator extends BaseTokenIterator {
  constructor(public data: string, public rgx: RegExp = /({\/*call\s*([^{|}|\s]*)\s*[^{|}]*\/{0,1}})/g) {
    super(data, rgx);
  }
}

export class NamespaceIterator extends BaseTokenIterator {
  constructor(public data: string, public rgx: RegExp = /({namespace\s+([^{|}|\s]*)\s*[^{|}]*})/g) {
    super(data, rgx);
  }
}