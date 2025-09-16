import * as vscode from 'vscode';
import { GitExtension, Repository } from '../git';

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

  async getStagedChanges(): Promise<{ stagedChanges: string | undefined; repository: Repository | undefined }> {
    try {
      const gitExtension = await this.getGitAPI();
      if (!gitExtension) {
        throw new Error('Git extension not found');
      }

      const api = gitExtension.getAPI(1);
      const { repositories } = api;

      if (repositories.length === 0) {
        throw new Error('No Git repositories found');
      }

      const activeRepository = this.getActiveRepository(api);
      const reposToCheck = activeRepository
        ? [activeRepository, ...repositories.filter(r => r !== activeRepository)]
        : repositories;

      for (const repository of reposToCheck) {
        const stagedChanges = await this.getRepositoryChanges(repository);
        if (stagedChanges) {
          return { stagedChanges, repository };
        }
      }
      
      return { stagedChanges: undefined, repository: undefined };
    } catch (error) {
      console.error('GitService: Error getting staged changes:', error);
      throw error;
    }
  }

  private async getRepositoryChanges(repository: Repository): Promise<string | undefined> {
    const stagedDiff = await this.getRepositoryStagedDiff(repository);
    if (stagedDiff && stagedDiff.trim() !== '') {
      return stagedDiff;
    }

    const headDiff = await this.getRepositoryDiff(repository);
    if (headDiff && headDiff.trim() !== '') {
      return headDiff;
    }

    return undefined;
  }

  private getActiveRepository(api: any): Repository | undefined {
    try {
      // In VS Code, the active repository is typically the one associated with the currently active file
      // or the first repository if no file is active
      const activeTextEditor = vscode.window.activeTextEditor;
      if (activeTextEditor) {
        const activeFileUri = activeTextEditor.document.uri;
        // Try to find the repository that contains the active file
        for (const repository of api.repositories) {
          const repoPath = repository.rootUri.fsPath;
          if (activeFileUri.fsPath.startsWith(repoPath)) {
            return repository;
          }
        }
      }
      
      // If no active file or no repository found for active file, return the first repository
      if (api.repositories && api.repositories.length > 0) {
        return api.repositories[0];
      }
      
      return undefined;
    } catch (error) {
      console.log('GitService: Could not determine active repository:', error);
      // Fallback to first repository
      try {
        if (api.repositories && api.repositories.length > 0) {
          return api.repositories[0];
        }
      } catch (fallbackError) {
        console.log('GitService: Fallback to first repository failed:', fallbackError);
      }
      return undefined;
    }
  }

  private async getRepositoryStagedDiff(repository: Repository): Promise<string> {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const command = 'git diff --cached';
      const cwd = repository.rootUri.fsPath;
      
      exec(command, { cwd }, (error: any, stdout: string, _stderr: string) => {
        if (error) {
          reject(new Error(`Git command failed: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private async getRepositoryDiff(repository: Repository): Promise<string> {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const command = 'git diff HEAD';
      const cwd = repository.rootUri.fsPath;
      
      exec(command, { cwd }, (error: any, stdout: string, _stderr: string) => {
        if (error) {
          reject(new Error(`Git command failed: ${error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  applyCommitMessage(message: string, repository: Repository | undefined): void {
    try {
      if (!repository) {
        // Fallback to get the Git extension and use the first repository
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (!gitExtension) {
          throw new Error('Git extension not found');
        }

        const api = gitExtension.getAPI(1);
        if (api.repositories.length === 0) {
          throw new Error('No Git repositories found');
        }

        repository = api.repositories[0];
      }
      
      repository.inputBox.value = message;
    } catch (error) {
      console.error('Error applying commit message:', error);
      throw error;
    }
  }
}