import { TextDocuments } from 'vscode-languageserver';

export namespace Server {
  export const Config = {
    capabilities: {
      definitionProvider: true,
      textDocumentSync: (new TextDocuments()).syncKind,
      completionProvider: {
        resolveProvider: true
      }
    }
  }
}