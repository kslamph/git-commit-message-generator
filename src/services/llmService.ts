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
    return `Analyze the git diff and generate ONE Conventional Commits message.

CRITICAL RULES:
1. Output ONLY the commit message - no markdown, no intro text, no "Summary:", no "The changes:".
2. Default to a SINGLE LINE. Use multi-line body ONLY when absolutely necessary for clarity.
3. Generate ONE commit message only - not a list of messages.

HEADER FORMAT:
<type>(<scope>): <what changed and why>

Type: feat, fix, refactor, chore, docs, test, perf, ci, build, revert, style
Scope: brief noun (e.g., auth, api, ui, db) - omit if unclear
Summary: 50 chars max, imperative mood, captures the ESSENCE (why, not how)

BODY FORMAT (use sparingly):
- Only for multi-part changes or breaking changes
- Each bullet: 72 chars max, imperative mood
- Focus on KEY changes only - omit implementation details, refactors, code cleanup
- Omit if all changes are covered by header

EXAMPLE 1 (single line):
feat(auth): add OAuth login

EXAMPLE 2 (single line):
fix(db): prevent duplicate user creation

EXAMPLE 3 (multi-line):
feat(api): add streaming support for large responses
- implement server-sent events endpoint
- add client reconnection logic

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
    let cleaned = response;

    // Remove thinking blocks (e.g., ...</think>, think> ...)
    cleaned = cleaned.replace(/[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/^think>[\s\S]*?$/gm, '');
    cleaned = cleaned.replace(/^\s*think>[\s\S]*?$/gm, '');

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/^```\w*\s*\n?|```$/gm, '');
    cleaned = cleaned.replace(/```[\s\S]*?\n([\s\S]*?)\n```/g, '$1');

    // Remove any leading or trailing quotes
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // Remove common prefixes like "Here is a commit message:" or similar
    cleaned = cleaned.replace(/^(Here is |Here's |Suggested |Generated )?a (commit )?message?(:\s*)?/i, '');

    // Remove meta-text patterns
    cleaned = cleaned.replace(/^Summary of changes?:?\s*$/im, '');
    cleaned = cleaned.replace(/^The changes?:?\s*$/im, '');
    cleaned = cleaned.replace(/^What changed:?\s*$/im, '');
    cleaned = cleaned.replace(/\s*[Tt]his (commit message|message).*$/, '');
    cleaned = cleaned.replace(/\s*[Tt]he (commit message|message).*$/, '');
    cleaned = cleaned.replace(/\s*[Cc]onsider using this.*$/, '');
    cleaned = cleaned.replace(/\s*[Pp]ossible commit message.*$/, '');

    // Remove any remaining prefixes
    cleaned = cleaned.replace(/^[Cc]ommit [Mm]essage:\s*/, '');
    cleaned = cleaned.replace(/^[Cc]ommit:\s*/, '');

    // Trim whitespace
    cleaned = cleaned.trim();
    return cleaned;
  }
}