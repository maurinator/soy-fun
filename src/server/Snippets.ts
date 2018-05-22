import { 
  CompletionItemKind,
  TextEdit,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocuments
} from 'vscode-languageserver';
import {
  TokenIterator
} from './Iterators';

let documents: TextDocuments;
let _textDocumentPositionParams: TextDocumentPositionParams;

export function Snippets (d: TextDocuments, _docParams: TextDocumentPositionParams): CompletionItem[] {
  documents = d;
  _textDocumentPositionParams = _docParams;
  return LetSnippets()
    .concat(CallSnippets())
    .concat(IfSnippets())
    .concat(ForEachSnippets())
    .concat(SwitchSnippets())
    .concat(TemplateSnippets());
}

function BaseSnippet(label: string, replaceText: string): CompletionItem {
  let document = documents.get(_textDocumentPositionParams.textDocument.uri);
  let it = new TokenIterator(document.getText());
  let t = it.get(_textDocumentPositionParams.position);
  let textEdit = TextEdit.replace({
    start: {
      line: t.line,
      character: t.character + 1
    },
    end: {
      line: t.line,
      character: t.contents.length + t.character - 1
    }},
    replaceText
  );
  return {
    label: label,
    kind: CompletionItemKind.Snippet,
    textEdit: textEdit,
    additionalTextEdits: [
      TextEdit.del({
        start: {
          line: t.line,
          character: t.character
        }, 
        end: {
          line: t.line,
          character: t.character + 1
        }
      }), TextEdit.del({
        start: {
          line: t.line,
          character: t.contents.length + t.character
        },
        end: {
          line: t.line,
          character: t.contents.length + t.character + 1
        }
    })],
    detail: replaceText
  };
}

function CallSnippets(): CompletionItem[] {
  return [ 
    BaseSnippet(
      'call', 
      `{call namespace.templateName /}`
    )
  ];
}

function LetSnippets(): CompletionItem[] {
  return [
    BaseSnippet(
      'let', 
      `{let $var: 'value' /}`
    ),
    BaseSnippet(
      'let', 
      `{let $var}\n  value\n{/let}`
    )
  ];
}

function IfSnippets(): CompletionItem[] {
  return [
    BaseSnippet(
      'if', 
      `{if $var}\n  value\n{/if}`
    ),
    BaseSnippet(
      'if', 
      `{if $var}\n  value\n  {else}\n  value2\n{/if}`
      ),
    BaseSnippet(
      'if', 
      `{if $var}\n  value\n  {elseif $var2}\n  value2\n{/if}`
    )  
  ];
}

function ForEachSnippets(): CompletionItem[] {
  return [
    BaseSnippet(
      'foreach', 
      `{foreach $item in $items}\n  {$item?:''}\n{/foreach}`
    ),    
    BaseSnippet(
      'foreach', 
      `{foreach $i in range(0,5)}\n  {$i}\n{/foreach}`
    ),    
  ];
}

function SwitchSnippets(): CompletionItem[] {
  return [
    BaseSnippet(
      'switch', 
      `{switch $var}\n  {case '1'}\n    value\n  {case '2'}\n    value\n  {default}\n  value\n{/switch}`
    ),    
  ];
}

function TemplateSnippets(): CompletionItem[] {
  return [
    BaseSnippet(
      'template', 
      `/**\n * @param sampleParam\n */\n{template .template_name}\n  \n{/template}`
    ),    
  ];
}