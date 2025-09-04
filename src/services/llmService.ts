import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ConfigManager, ExtensionConfig } from '../config/configManager';

export class LLMService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async generateCommitMessage(diff: string): Promise<string | undefined> {
    try {
      const config = this.configManager.getConfig();
      const apiKey = await this.configManager.getApiKey();

      if (!apiKey) {
        vscode.window.showErrorMessage('API key is not configured. Please set it in the extension settings.');
        return;
      }

      // Create prompt for the LLM
      const prompt = this.createPrompt(diff);

      // Call the LLM API
      const response = await this.callLLM(
        config.baseUrl,
        config.modelId,
        prompt,
        config.temperature,
        apiKey
      );

      return response;
    } catch (error) {
      console.error('Error generating commit message:', error);
      vscode.window.showErrorMessage(`Failed to generate commit message: ${error}`);
      return undefined;
    }
  }

  private createPrompt(diff: string): string {
    return `Based on the following git diff, generate a concise git commit message following conventional commit format.
Only respond with the commit message, nothing else.

Diff:
${diff}`;
  }

  private async callLLM(
    baseUrl: string,
    modelId: string,
    prompt: string,
    temperature: number,
    apiKey: string
  ): Promise<string> {
    const url = baseUrl.endsWith('/chat/completions') 
      ? baseUrl 
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 200
      })
    }) as any;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}