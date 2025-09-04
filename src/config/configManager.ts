import * as vscode from 'vscode';

export interface ExtensionConfig {
  llmEngine: string;
  baseUrl: string;
  modelId: string;
  temperature: number;
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
      llmEngine: this.config.get('llmEngine', 'openai'),
      baseUrl: this.config.get('baseUrl', 'https://api.openai.com/v1'),
      modelId: this.config.get('modelId', 'gpt-3.5-turbo'),
      temperature: this.config.get('temperature', 0.7)
    };
  }

  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get('gitCommitMessageGenerator.apiKey');
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store('gitCommitMessageGenerator.apiKey', apiKey);
  }

  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete('gitCommitMessageGenerator.apiKey');
  }
}