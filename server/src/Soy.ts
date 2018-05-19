import { Position } from 'vscode-languageserver';

export class SoyTemplate {
	constructor(
    public uri: string, 
    public name:string, 
    public namespace: string, 
    public start: Position, 
    public end: Position
  ) {}
}