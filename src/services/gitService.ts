import * as vscode from 'vscode';
import { GitExtension } from '../git';

export class GitService {
  private getGitAPI(): Promise<GitExtension | undefined> {
    return new Promise((resolve) => {
      const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
      if (!gitExtension) {
        resolve(undefined);
        return;
      }

      if (!gitExtension.isActive) {
        gitExtension.activate().then(() => {
          resolve(gitExtension.exports);
        });
      } else {
        resolve(gitExtension.exports);
      }
    });
  }

  async getStagedChanges(): Promise<string | undefined> {
    try {
      const gitExtension = await this.getGitAPI();
      if (!gitExtension) {
        throw new Error('Git extension not found');
      }

      const api = gitExtension.getAPI(1);
      const repositories = api.repositories;

      if (repositories.length === 0) {
        throw new Error('No Git repositories found');
      }

      // For simplicity, we'll use the first repository
      const repository = repositories[0];
      
      // First, try to get staged changes
      const uri = repository.rootUri;
      let diff = await this.executeGitCommand(uri, ['diff', '--cached']);
      
      // If no staged changes, get all working changes
      if (!diff || diff.trim() === '') {
        diff = await this.executeGitCommand(uri, ['diff', 'HEAD']);
      }
      
      return diff || undefined;
    } catch (error) {
      console.error('Error getting staged changes:', error);
      throw error;
    }
  }

  private async executeGitCommand(uri: vscode.Uri, args: string[]): Promise<string> {
    try {
      // Try to use the Git extension's built-in command execution
      const result = await vscode.commands.executeCommand(
        'git.runGitCommand',
        {
          repository: { rootUri: uri },
          args: args
        }
      );
      
      return result as string;
    } catch (error) {
      // Fallback to using child_process if the command fails
      console.warn('git.runGitCommand failed, falling back to child_process:', error);
      return await this.executeGitCommandFallback(uri, args);
    }
  }

  private async executeGitCommandFallback(uri: vscode.Uri, args: string[]): Promise<string> {
    const { exec } = require('child_process');
    const path = require('path');
    
    return new Promise((resolve, reject) => {
      const command = `git ${args.join(' ')}`;
      const cwd = uri.fsPath || process.cwd();
      
      exec(command, { cwd }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(`Git command failed: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.warn('Git command stderr:', stderr);
        }
        
        resolve(stdout);
      });
    });
  }

  applyCommitMessage(message: string): void {
    try {
      const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
      if (!gitExtension) {
        throw new Error('Git extension not found');
      }

      const api = gitExtension.getAPI(1);
      const repositories = api.repositories;

      if (repositories.length === 0) {
        throw new Error('No Git repositories found');
      }

      // For simplicity, we'll use the first repository
      const repository = repositories[0];
      repository.inputBox.value = message;
    } catch (error) {
      console.error('Error applying commit message:', error);
      throw error;
    }
  }
}