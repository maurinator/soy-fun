'use strict';

import * as path from 'path';
import {
	IPCMessageReader, 
	IPCMessageWriter, 
	createConnection, 
	IConnection, 
	TextDocuments, 
	InitializeResult, 
	TextDocumentPositionParams, 
	CompletionItem,
	Location,
	CompletionItemKind,
	Position,
	TextEdit
} from 'vscode-languageserver';
import { runSafe } from './Utils';
import { 
	NamespaceIterator, 
	CallIterator,
	TokenIterator,
} from './Iterators';
import { Server } from './config';
import { Files } from './Files';
import { Snippets } from './Snippets';

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string;
let files: Files;

connection.onInitialize((_params): InitializeResult => {
	workspaceRoot = _params.rootPath;
	files = new Files(connection);
	return Server.Config;
});

connection.onDefinition((definitionParams, token) => {
	return runSafe(() => {
		let document = documents.get(definitionParams.textDocument.uri);
		let cursor = document.positionAt(document.offsetAt(definitionParams.position));
		let it = new CallIterator(document.getText());

		let soyToken = it.get(cursor);
		if (!soyToken) return null;

		let t;
		let isRelative = soyToken.name[0] == '.';
		if (isRelative) {
			it = new NamespaceIterator(document.getText());
			let namespace = it.next().name;
			t = namespace + soyToken.name;
		} else {
			t = soyToken.name;
		}
		if (!files.get(t).length) return null;
		let result: Location[] = [];
		for (let file of files.get(t)) {
			result = result.concat([{
				uri: 'file://' + path.resolve(workspaceRoot + '/' + file.uri),
				range: {
					start: file.start,
					end: file.end
				}
			}]);
		}
		return result;
	}, null, `Error while computing definitions for ${definitionParams.textDocument.uri}`, token);
});

connection.onDidChangeWatchedFiles((_change) => {
	connection.console.log('We received an file change event');
});

connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	let result: CompletionItem[] = Snippets(documents, _textDocumentPosition);
	
	let document = documents.get(_textDocumentPosition.textDocument.uri);
	let it = new TokenIterator(document.getText());
	let token = it.get(_textDocumentPosition.position);

	for (let key of files.all()) {
		let template = files.get(key)[0];
		result.push({
			label: key, 
			kind: CompletionItemKind.Variable,
			textEdit: token ? TextEdit.replace({
				start: Position.create(token.line, token.character + 1),
				end: Position.create(token.line, token.character + token.contents.length - 1)
			}, key): null,
			documentation: template.documentation
		});
	}
	return result;
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	return item;
});

connection.listen();
