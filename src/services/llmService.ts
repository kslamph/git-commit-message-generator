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
        throw new Error('API key is not configured. Please set it using the "Set API Key" command.');
      }

      // Create prompt for the LLM
      const prompt = this.createPrompt(diff);

      // Call the LLM API (non-streaming)
      const response = await this.callLLM(
        config.baseUrl,
        config.modelId,
        prompt,
        apiKey
      );

      return response;
    } catch (error) {
      console.error('Error generating commit message:', error);
      throw error;
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
        temperature: 0.7,
        max_tokens: 8192
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