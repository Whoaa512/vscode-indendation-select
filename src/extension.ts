// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function countSpacingAtPosition(
  editor: vscode.TextEditor,
  anchor: number,
): number;
function countSpacingAtPosition(
  editor: vscode.TextEditor,
  anchor: vscode.Position,
): number;
function countSpacingAtPosition(
  editor: vscode.TextEditor,
  anchor: any,
): number {
  /**
   * The offset of the first character which is not a whitespace character as defined
   * by `/\s/`. **Note** that if a line is all whitespace the length of the line is returned.
   */
  return editor.document.lineAt(anchor).firstNonWhitespaceCharacterIndex;
}

function searchForNextLine(
  editor: vscode.TextEditor,
  indentCount: number,
  startLineNum: number,
  step: number,
): number {
  let currentIndent = Infinity;
  let lineNum = startLineNum;
  while (currentIndent >= indentCount && currentIndent >= 0) {
    lineNum += step;
    let next = countSpacingAtPosition(editor, lineNum + step);
    // Skip empty lines
    if (next === 0) {
      next = Infinity;
    }
    currentIndent = next;
  }
  return lineNum;
}

export function getNewSelection(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
): {
  indentCount: number;
  start: number;
  end: number;
} {
  const startAnchor = selection.anchor;
  let indentCount = countSpacingAtPosition(editor, startAnchor);
  // console.log('indentCount', indentCount);

  let startLineNum: number = startAnchor.line;
  // Handle case on empty newline between indented text
  if (indentCount === 0) {
    indentCount = Math.min(
      countSpacingAtPosition(editor, startAnchor.line + 1),
      countSpacingAtPosition(editor, startAnchor.line - 1),
    );
    startLineNum += 1;
    // console.log('indentCount', indentCount);
  }
  // console.log('startLineNum', startLineNum);

  // search up/down from selection to find all lines with matching indentation
  //    including empty newlines
  const firstLineNum = searchForNextLine(editor, indentCount, startLineNum, -1);
  const lastLineNum = searchForNextLine(editor, indentCount, startLineNum, 1);

  const start = editor.document.offsetAt(startAnchor.with(firstLineNum, 0));
  const lastLinePos = startAnchor.with(lastLineNum, 0);
  const lastLine = editor.document.lineAt(lastLinePos);
  const end = editor.document.offsetAt(lastLinePos) + lastLine.text.length;

  return {
    indentCount,
    start,
    end,
  };
}

function multiSelectText(editor: vscode.TextEditor) {
  editor.selections = editor.selections.map((selection) => {
    const newSelect = getNewSelection(editor, selection);
    return new vscode.Selection(
      editor.document.positionAt(newSelect.start), //convert text index to vs selection index
      editor.document.positionAt(newSelect.end),
    );
  });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('indentation-select.select', function () {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      multiSelectText(editor);
    }),
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
