import * as fs from 'fs';
import { SoyTemplate } from './Soy';
import { 
  IConnection,
  Position,
  TextDocument
} from 'vscode-languageserver';
import { 
	TemplateIterator, 
	NamespaceIterator
} from './Iterators';
let glob = require('glob');

export class Files {
  private Project = new Map<string, SoyTemplate[]>();
  
  constructor(public connection: IConnection) {
    glob('**/*.soy', (err: any, files: any) => {
      if (err) return;
      for (let file of files) {
        fs.readFile(file, (err: NodeJS.ErrnoException, data: Buffer) => {
          if (err) return;
          let FileContents = data.toString();
          let NamespaceToken = new NamespaceIterator(FileContents).next();
          if (!NamespaceToken) return;
          let namespace = NamespaceToken.name;
          let it = new TemplateIterator(TextDocument.create(file, 'soy', 0, FileContents));
          let template;
          while (template = it.next()) {
            this.add(namespace + template.name, new SoyTemplate(
              file,
              template.name,
              namespace,
              Position.create(template.line, 0),
              Position.create(template.line, 0),
              template.comments,
              template.params
            ));
          }
        });
      }
    });
  }

  add (file: string, soyTemplate: SoyTemplate) {
    let TemplatesByURI = this.get(file);    
    TemplatesByURI = TemplatesByURI.concat(soyTemplate);
    this.Project.set(file, TemplatesByURI);
  }

  get (file: string): SoyTemplate[] {
    return this.Project.get(file) || [];
  }

  all (): IterableIterator<string> {
    return this.Project.keys();
  }
}