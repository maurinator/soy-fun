'use strict';

import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import { 
	LanguageClient, 
	LanguageClientOptions, 
	ServerOptions, 
	TransportKind
} from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
	let serverModule = context.asAbsolutePath(path.join('server/out/src', 'server.js'));
	let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	let clientOptions: LanguageClientOptions = {
		documentSelector: [{scheme: 'file', language: 'soy'}],
		synchronize: {
			configurationSection: 'Soy Language Autocomplete',
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}
	let disposable = new LanguageClient('Soy Language Autocomplete', 'Soy Language Server', serverOptions, clientOptions).start();
	context.subscriptions.push(disposable);
}
