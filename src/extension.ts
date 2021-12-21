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

function searchForNextLine({
  editor,
  startLineNum,
  step,
}: {
  editor: vscode.TextEditor;
  startLineNum: number;
  step: number;
}): number {
  let indentCount = countSpacingAtPosition(editor, startLineNum);
  let lineNum = startLineNum;

  // Find first non-empty indent count from start
  while (indentCount === 0) {
    lineNum += step;
    indentCount = countSpacingAtPosition(editor, lineNum);
  }

  // Then find last line before indentation changes
  let currentIndent = Infinity;
  while (
    currentIndent >= indentCount &&
    currentIndent >= 0 &&
    // bounds checks
    lineNum >= 0 &&
    lineNum < editor.document.lineCount
  ) {
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

export function getNewSelectionIndex(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
): {
  start: number;
  end: number;
} {
  const startAnchor = selection.anchor;
  console.log('selection', selection);

  let startLineNum: number = startAnchor.line;
  let endLineNum: number = selection.end.line;
  console.log('startLineNum', startLineNum);

  // search up/down from selection to find all lines with matching indentation
  //    including empty newlines
  const firstLineNum = searchForNextLine({
    editor,
    startLineNum,
    step: -1,
  });
  const lastLineNum = searchForNextLine({
    editor,
    startLineNum,
    step: 1,
  });

  const start = editor.document.offsetAt(startAnchor.with(firstLineNum, 0));
  const lastLinePos = startAnchor.with(lastLineNum, 0);
  const lastLine = editor.document.lineAt(lastLinePos);
  // Add one to get the line separator
  const end = editor.document.offsetAt(lastLinePos) + lastLine.text.length + 1;

  return {
    start,
    end,
  };
}

function createNewSelection(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
) {
  const newSelect = getNewSelectionIndex(editor, selection);
  return new vscode.Selection(
    editor.document.positionAt(newSelect.start), //convert text index to vs selection index
    editor.document.positionAt(newSelect.end),
  );
}

function multiSelectText(editor: vscode.TextEditor) {
  console.log('editor.selections.length', editor.selections.length);
  editor.selections = editor.selections.map((selection) =>
    createNewSelection(editor, selection),
  );
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

      try {
        multiSelectText(editor);
      } catch (error) {
        console.error(error);
      }
    }),
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
