import * as vscode from 'vscode';

export interface ExtensionConfig {
  baseUrl: string;
  modelId: string;
  apiKey: string;
}

export class ConfigManager {
  private context: vscode.ExtensionContext;
  private config: vscode.WorkspaceConfiguration;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.config = vscode.workspace.getConfiguration('gitCommitMessageGenerator');
  }

  getConfig(): ExtensionConfig {
    return {
      baseUrl: this.config.get('baseUrl', 'https://api.openai.com/v1'),
      modelId: this.config.get('modelId', 'gpt-3.5-turbo'),
      apiKey: this.config.get('apiKey', '')
    };
  }
}