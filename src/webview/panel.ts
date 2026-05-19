import * as vscode from "vscode";
import * as path from "path";
import type { ExtensionMessage, WebviewMessage } from "../types";
import {
  createPhaseMessage, createStaticResultMessage, createReportChunkMessage,
  createExtensionsMessage, createErrorMessage, isWebviewMessage,
} from "./messaging";
import { runFullAnalysis, handleAskQuestion, type PipelineCallbacks } from "../pipeline/orchestrator";

export class AnalysisPanel {
  public static currentPanel: AnalysisPanel | undefined;
  private static readonly viewType = "projectclassmate.analysis";
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _staticResult: any = null;

  public static createOrShow(extensionUri: vscode.Uri, workspaceRoot: string): AnalysisPanel {
    const column = vscode.ViewColumn.Two;
    if (AnalysisPanel.currentPanel) {
      AnalysisPanel.currentPanel._panel.reveal(column);
      return AnalysisPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel(
      AnalysisPanel.viewType, "ProjectClassmate", column,
      {
        enableScripts: true, retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "webview-ui", "dist"),
          vscode.Uri.joinPath(extensionUri, "media"),
        ],
      }
    );
    AnalysisPanel.currentPanel = new AnalysisPanel(panel, extensionUri);
    AnalysisPanel.currentPanel.runAnalysis(workspaceRoot);
    return AnalysisPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.webview.html = this._getHtmlContent();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      if (!isWebviewMessage(msg)) return;
      switch (msg.type) {
        case "ready": break;
        case "ask": await this._handleAsk(msg.question, msg.context); break;
        case "expand-tech": await this._handleExpandTech(msg.techName); break;
      }
    }, null, this._disposables);
  }

  public async runAnalysis(rootPath: string): Promise<void> {
    const cbs: PipelineCallbacks = {
      onPhase: (phase) => this._postMessage(createPhaseMessage(phase)),
      onStaticResult: (result) => { this._staticResult = result; this._postMessage(createStaticResultMessage(result)); },
      onReportChunk: (section, content) => this._postMessage(createReportChunkMessage(section, content)),
      onExtensions: (exts) => this._postMessage(createExtensionsMessage(exts)),
      onError: (message) => this._postMessage(createErrorMessage(message)),
    };
    await runFullAnalysis(rootPath, cbs);
  }

  private async _handleAsk(question: string, context?: string): Promise<void> {
    try {
      const answer = await handleAskQuestion(question, context);
      this._postMessage({ type: "report-chunk", section: "overview", content: `\n\n---\n### 💬 追问解答\n\n${answer}\n` });
    } catch (err: any) { this._postMessage(createErrorMessage(err.message ?? "问答出错")); }
  }

  private async _handleExpandTech(techName: string): Promise<void> {
    try {
      const answer = await handleAskQuestion(
        `请详细介绍一下 "${techName}" 这项技术：它是什么、核心概念、常见使用场景、学习路径推荐。`, ""
      );
      this._postMessage({ type: "report-chunk", section: "overview", content: `\n\n---\n### 📖 技术详解: ${techName}\n\n${answer}\n` });
    } catch (err: any) { this._postMessage(createErrorMessage(err.message ?? "展开技术详情出错")); }
  }

  private _postMessage(msg: ExtensionMessage): void { this._panel.webview.postMessage(msg); }

  public dispose(): void {
    AnalysisPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) this._disposables.pop()!.dispose();
  }

  private _getHtmlContent(): string {
    const distUri = vscode.Uri.joinPath(this._extensionUri, "webview-ui", "dist");
    const scriptUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(distUri, "assets", "index.js"));
    const styleUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(distUri, "assets", "index.css"));
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'none'; img-src https: data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>ProjectClassmate</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 64; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}
