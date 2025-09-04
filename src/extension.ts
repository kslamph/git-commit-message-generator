import * as vscode from 'vscode';
import { GitExtension } from './git';
import { ConfigManager } from './config/configManager';
import { GitService } from './services/gitService';
import { LLMService } from './services/llmService';
import { UIController } from './controllers/uiController';

let configManager: ConfigManager;
let gitService: GitService;
let llmService: LLMService;
let uiController: UIController;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Git Commit Message Generator is now active');

  // Initialize components
  configManager = new ConfigManager(context);
  gitService = new GitService();
  llmService = new LLMService(configManager);
  uiController = new UIController();

  // Register commands
  const generateCommitMessageDisposable = vscode.commands.registerCommand(
    'gitCommitMessageGenerator.generateCommitMessage',
    async () => {
      try {
        // Check if Git extension is available
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!gitExtension?.isActive) {
          uiController.showError('Git extension is not available.');
          return;
        }

        // Get staged changes
        const stagedChanges = await gitService.getStagedChanges();
        if (!stagedChanges) {
          uiController.showError('No staged changes found.');
          return;
        }

        // Generate commit message
        uiController.showProgress();
        const commitMessage = await llmService.generateCommitMessage(stagedChanges, (message: string) => {
          uiController.updateProgress(message);
        });
        uiController.hideProgress();

        if (commitMessage) {
          // Apply commit message to Git input box
          gitService.applyCommitMessage(commitMessage);
          uiController.showInfo('Commit message generated successfully!');
        }
      } catch (error) {
        uiController.showError(`Failed to generate commit message: ${error}`);
        console.error(error);
      }
    }
  );

  const setApiKeyDisposable = vscode.commands.registerCommand(
    'gitCommitMessageGenerator.setApiKey',
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your API key',
        password: true
      });

      if (apiKey) {
        await configManager.setApiKey(apiKey);
        uiController.showInfo('API key saved successfully!');
      }
    }
  );

  context.subscriptions.push(generateCommitMessageDisposable);
  context.subscriptions.push(setApiKeyDisposable);
  context.subscriptions.push(uiController); // Add UIController to disposables
}

export function deactivate() {
  console.log('Git Commit Message Generator is now deactivated');
}