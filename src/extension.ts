import * as vscode from "vscode";
import { AnalysisPanel } from "./webview/panel";
import { setApiKey, getConfig } from "./config/settings";

export function activate(context: vscode.ExtensionContext) {
  console.log("ProjectClassmate activated");

  const analyzeCmd = vscode.commands.registerCommand("projectclassmate.analyzeProject", async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage("ProjectClassmate: 请先打开一个工作区");
      return;
    }
    const rootPath = folders[0].uri.fsPath;
    const hasPython = await vscode.workspace.findFiles(
      new vscode.RelativePattern(rootPath, "**/*.py"),
      "**/{__pycache__,.venv,venv,env,node_modules,.git}/**", 1
    );
    if (hasPython.length === 0) {
      const choice = await vscode.window.showWarningMessage(
        "当前工作区未检测到 Python 文件。继续？", "继续", "取消"
      );
      if (choice !== "继续") return;
    }
    AnalysisPanel.createOrShow(context.extensionUri, rootPath);
  });

  const setKeyCmd = vscode.commands.registerCommand("projectclassmate.setApiKey", async () => {
    const provider = await vscode.window.showQuickPick(["openai", "anthropic", "ollama", "custom"], {
      placeHolder: "选择 LLM 提供商", title: "ProjectClassmate: 设置 API Key"
    });
    if (!provider) return;
    const apiKey = await vscode.window.showInputBox({
      prompt: `输入 ${provider} 的 API Key`, password: true,
      validateInput: v => v && v.trim().length >= 3 ? null : "API Key 不能为空"
    });
    if (!apiKey) return;
    await setApiKey(provider, apiKey.trim());
    vscode.window.showInformationMessage(`ProjectClassmate: ${provider} API Key 已保存`);
  });

  context.subscriptions.push(analyzeCmd, setKeyCmd);
}

export function deactivate() { AnalysisPanel.currentPanel?.dispose(); }
