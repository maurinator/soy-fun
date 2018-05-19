'use strict';

import * as fs from 'fs';
import * as path from 'path';
import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, InitializeResult, TextDocumentPositionParams, CompletionItem,
	Location, Position, CompletionItemKind, TextEdit
} from 'vscode-languageserver';
import { SoyTemplate } from './Soy';
import { runSafe } from './Utils';
import { 
	TemplateIterator, 
	NamespaceIterator, 
	CallIterator 
} from './Iterators';

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string;
let SoyTemplateNameToFile = new Map<string, SoyTemplate[]>();

connection.onInitialize((_params): InitializeResult => {
	workspaceRoot = _params.rootPath;
	// build initial template calls
	let glob = require('glob');
	glob('**/*.soy', (err: any, files: any) => {
		if (err) return;
		for (let f of files) {
			fs.readFile(f, (err: NodeJS.ErrnoException, data: Buffer) => {
				if (err) return;
				let strData = data.toString();
				let namespace = new NamespaceIterator(strData).next();
				if (!namespace) return;
				let it = new TemplateIterator(strData);
				let template;
				while (template = it.next()) {
					connection.console.log(template.name);
					connection.console.log(template.name);
					connection.console.log(template.name);
					SoyTemplateNameToFile.set(
						namespace.name + template.name,
						(SoyTemplateNameToFile.get(namespace.name + template.name) || []).concat([
							new SoyTemplate(
								f,
								template.name,
								namespace.name,
								Position.create(
									template.line,
									0
								),
								Position.create(
									template.line,
									0
								),
								template.comments,
								template.params
							)
						])
					);
				}
			});
		}		
	});
	return {
		capabilities: {
			definitionProvider: true,
			textDocumentSync: documents.syncKind,
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

connection.onDefinition((definitionParams, token) => {
	return runSafe(() => {
		let document = documents.get(definitionParams.textDocument.uri);
		let cursor = document.positionAt(document.offsetAt(definitionParams.position));
		let it = new CallIterator(document.getText());

		let token;		
		while (token = it.next()) {
			if (!token.name) continue;
			let tokenLength = token.character + token.contents.length;
			let found = cursor.line == token.line && token.character <= cursor.character && cursor.character <= tokenLength;
			if (found) break;
		}
		if (!token) return null;

		let t;
		let isRelative = token.name[0] == '.';
		if (isRelative) {
			it = new NamespaceIterator(document.getText());
			let namespace = it.next().name;
			t = namespace + token.name;
		} else {
			t = token.name;
		}
		if (!SoyTemplateNameToFile.has(t)) return null;
		let result: Location[] = [];
		for (let file of SoyTemplateNameToFile.get(t)) {
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
	let cursor = _textDocumentPosition.position;
	let document = documents.get(_textDocumentPosition.textDocument.uri);
	let it = new CallIterator(document.getText());
	let token;
	
	while (token = it.next()) {
		let tokenLength = token.character + token.contents.length;
		let found = cursor.line == token.line && token.character <= cursor.character && cursor.character <= tokenLength;
		if (found) break;
	}

	let result = [];
	for (let key of SoyTemplateNameToFile.keys()) {
		let template = SoyTemplateNameToFile.get(key)[0];
		let label = `{call ${key}`;
		if (template.params) {
			label += '}';
			for (let param of template.params) {
				label += `\n  {param ${param}: '' /}`;
			}
			label += '\n{/call}';
		} else {
			label += ' /}';
		}
		result.push({
			label: label, 
			kind: CompletionItemKind.Keyword,
			textEdit: token ? TextEdit.replace({
				start: Position.create(token.line, token.character),
				end: Position.create(token.line, token.character + token.contents.length)
			}, label): null,
			documentation: template.documentation // first item's documentation
		});
	}
	return result;
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	// item.detail = `${item.label} details`;
	// item.documentation = `${item.label} documentation`;
	return item;
});

connection.listen();
