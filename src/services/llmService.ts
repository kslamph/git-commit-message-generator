import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ConfigManager, ExtensionConfig } from '../config/configManager';

export class LLMService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async generateCommitMessage(diff: string, onProgress?: (message: string) => void): Promise<string | undefined> {
    try {
      const config = this.configManager.getConfig();

      if (!config.apiKey) {
        throw new Error('API key is not configured. Please set it in the extension settings.');
      }

      // Create prompt for the LLM
      const prompt = this.createPrompt(diff);

      // Call the LLM API with streaming support
      const response = await this.callLLMStream(
        config.baseUrl,
        config.modelId,
        prompt,
        config.apiKey,
        onProgress
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

  private async callLLMStream(
    baseUrl: string,
    modelId: string,
    prompt: string,
    apiKey: string,
    onProgress?: (message: string) => void
  ): Promise<string> {
    const url = baseUrl.endsWith('/chat/completions') 
      ? baseUrl 
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // For streaming, we need to set stream to true
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream'
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
        max_tokens: 8192,
        stream: true
      })
    }) as any;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    // Handle streaming response
    if (response.body && typeof response.body.on === 'function') {
      return new Promise<string>((resolve, reject) => {
        let fullResponse = '';
        let lastProgressUpdate = '';
        let isFinished = false;
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            resolve(fullResponse.trim());
          }
        }, 30000); // 30 second timeout
        
        response.body.on('data', (chunk: Buffer) => {
          if (isFinished) return;
          
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                isFinished = true;
                clearTimeout(timeout);
                resolve(fullResponse.trim());
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullResponse += content;
                  
                  // Update progress with the current response
                  if (onProgress) {
                    const words = fullResponse.split(/\s+/);
                    const currentWords = words.slice(0, Math.max(0, words.length - 1)).join(' ');
                    if (currentWords !== lastProgressUpdate) {
                      lastProgressUpdate = currentWords;
                      onProgress(currentWords);
                    }
                  }
                }
              } catch (e) {
                // Ignore parsing errors for incomplete JSON
              }
            }
          }
        });
        
        response.body.on('end', () => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeout);
            resolve(fullResponse.trim());
          }
        });
        
        response.body.on('error', (err: Error) => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeout);
            reject(err);
          }
        });
        
        response.body.on('close', () => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeout);
            resolve(fullResponse.trim());
          }
        });
      });
    } else {
      // Fallback to non-streaming if streaming is not supported
      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
  }
}