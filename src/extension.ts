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
      // Ensure progress is hidden even if something goes wrong
      let progressHidden = false;
      const hideProgressOnce = () => {
        if (!progressHidden) {
          progressHidden = true;
          uiController.hideProgress();
        }
      };

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
        
        // Set a timeout to ensure progress is hidden even if LLMService hangs
        const progressTimeout = setTimeout(() => {
          hideProgressOnce();
          uiController.showError('Commit message generation timed out. Please try again.');
        }, 45000); // 45 second timeout

        const commitMessage = await llmService.generateCommitMessage(stagedChanges, (message: string) => {
          uiController.updateProgress(message);
        });
        
        // Clear the timeout since we got a response
        clearTimeout(progressTimeout);
        hideProgressOnce();

        if (commitMessage) {
          // Apply commit message to Git input box
          gitService.applyCommitMessage(commitMessage);
          uiController.showInfo('Commit message generated successfully!');
        } else {
          // Show error if no commit message was generated
          uiController.showError('Failed to generate commit message: No response from API.');
        }
      } catch (error: unknown) {
        hideProgressOnce(); // Make sure to hide progress on error
        if (error instanceof Error) {
          uiController.showError(`Failed to generate commit message: ${error.message}`);
        } else {
          uiController.showError(`Failed to generate commit message: ${String(error)}`);
        }
        console.error('Error in generateCommitMessage:', error);
      } finally {
        // Final safety check to ensure progress is hidden
        setTimeout(() => hideProgressOnce(), 100);
      }
    }
  );

  context.subscriptions.push(generateCommitMessageDisposable);
  context.subscriptions.push(uiController); // Add UIController to disposables
}

export function deactivate() {
  console.log('Git Commit Message Generator is now deactivated');
}