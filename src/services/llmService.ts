import fetch from 'node-fetch';
import { ConfigManager } from '../config/configManager';

export class LLMService {
  private readonly configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async generateCommitMessage(diff: string): Promise<string | undefined> {
    try {
      const config = this.configManager.getConfig();
      const apiKey = await this.configManager.getApiKey();

      // Check if we're using a local model (localhost, 127.0.0.1, or other local addresses)
      const isLocalModel = this.isLocalModel(config.baseUrl);
      
      // Only require API key if not using a local model
      if (!isLocalModel && !apiKey) {
        throw new Error('API key is not configured. Please set it using the "Only Auto Commit: Set API Key" command.');
      }

      // Create prompt for the LLM
      const prompt = this.createPrompt(diff);

      // Call the LLM API (non-streaming)
      // Use API key if available, otherwise empty string
      const response = await this.callLLM(
        config.baseUrl,
        config.modelId,
        prompt,
        apiKey || ''
      );

      // Clean the response to remove any markdown code blocks
      const cleanedResponse = this.cleanResponse(response);

      return cleanedResponse;
    } catch (error) {
      throw error;
    }
  }

  private createPrompt(diff: string): string {
    return `Analyze the provided git diff and generate a concise, professional git commit message following the Conventional Commits specification.

Rules:
1. **Structure**:
   - If the changes focus on a **single goal**, use a **single line** only:
     \`<type>(<scope>): <concise summary>\`
   - If there are **multiple distinct goals**, use a **multi-line** format:
     \`<type>(<scope>): <concise summary of the main theme>\`
     
     \`- <concise bullet point for change 1>\`
     \`- <concise bullet point for change 2>\`

2. **Conciseness**:
   - **Do not** repeat the subject line in the body.
   - **Do not** explain "how" the code works, only "what" changed and "why".
   - Keep bullet points short (under 72 characters if possible).

3. **Tone**: Use the imperative mood (e.g., "fix" not "fixed", "add" not "added").

4. **Output**: Return ONLY the raw commit message. No markdown code blocks, no introductory text.

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

    // Prepare headers based on whether we have an API key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Only add Authorization header if API key is provided
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
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

  private isLocalModel(baseUrl: string): boolean {
    try {
      const url = new URL(baseUrl);
      const hostname = url.hostname.toLowerCase();
      
      // Check if it's a local address
      return hostname === 'localhost' ||
             hostname === '127.0.0.1' ||
             hostname === '::1' ||
             hostname.startsWith('192.168.') ||
             hostname.startsWith('10.') ||
             hostname.startsWith('172.') &&
             parseInt(hostname.split('.')[1]) >= 16 &&
             parseInt(hostname.split('.')[1]) <= 31;
    } catch (error) {
      // If URL parsing fails, check for common local indicators in the string
      return baseUrl.toLowerCase().includes('localhost') ||
             baseUrl.includes('127.0.0.1') ||
             baseUrl.includes('::1');
    }
  }

  private cleanResponse(response: string): string {
    
    // Remove markdown code blocks if present
    // Remove leading and trailing code block markers (```lang or just ```)
    let cleaned = response.replace(/^```\w*\s*\n?|```$/gm, '');
    
    // If there are still code blocks in the middle, remove them
    cleaned = cleaned.replace(/```[\s\S]*?\n([\s\S]*?)\n```/g, '$1');
    
    // Remove any leading or trailing quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Remove common prefixes like "Here is a commit message:" or similar
    cleaned = cleaned.replace(/^(Here is |Here's |Suggested |Generated )?a (commit )?message?(:\s*)?/i, '');
    
    // Remove any remaining markdown or formatting characters at the start/end
    cleaned = cleaned.replace(/^\W*/, '').replace(/\W*$/, '');
    
    // Additional cleaning: Remove any text that might be explanations after the actual commit message
    // Look for patterns like "This commit message..." or "The commit message..."
    cleaned = cleaned.replace(/\s*[Tt]his (commit message|message).*$/, '');
    cleaned = cleaned.replace(/\s*[Tt]he (commit message|message).*$/, '');
    cleaned = cleaned.replace(/\s*[Cc]onsider using this.*$/, '');
    cleaned = cleaned.replace(/\s*[Pp]ossible commit message.*$/, '');
    
    // Remove any remaining prefixes that might be added by the LLM
    cleaned = cleaned.replace(/^[Cc]ommit [Mm]essage:\s*/, '');
    cleaned = cleaned.replace(/^[Cc]ommit:\s*/, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    return cleaned;
  }
}