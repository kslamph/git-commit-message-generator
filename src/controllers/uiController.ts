import * as vscode from 'vscode';

export class UIController {
  private progressPromise: Promise<void> | undefined;
  private progressResolve: (() => void) | undefined;
  private progressReject: ((reason?: any) => void) | undefined;
  private statusBarItem: vscode.StatusBarItem | undefined;

  constructor() {
    // Create a status bar item for the flashing icon
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.text = '$(sparkle) Generate Commit';
    this.statusBarItem.command = 'gitCommitMessageGenerator.generateCommitMessage';
  }

  showProgress(): void {
    // Show the flashing icon
    if (this.statusBarItem) {
      this.statusBarItem.text = '$(sync~spin) Generating...';
      this.statusBarItem.show();
    }

    // Create a promise for the progress that can be resolved externally
    this.progressPromise = new Promise<void>((resolve, reject) => {
      this.progressResolve = resolve;
      this.progressReject = reject;
    });

    // Create the progress notification
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating commit message',
        cancellable: true
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => {
          if (this.progressReject) {
            this.progressReject(new Error('Operation cancelled by user'));
          }
          this.hideProgress();
        });
        
        // Wait for the external promise to resolve
        if (this.progressPromise) {
          return this.progressPromise;
        }
      }
    );
  }

  updateProgress(message: string): void {
    // In a full implementation, we would update the progress message
    // For now, we'll just log it
    console.log('Progress update:', message);
  }

  hideProgress(): void {
    // Hide the flashing icon and restore the original
    if (this.statusBarItem) {
      this.statusBarItem.text = '$(sparkle) Generate Commit';
      this.statusBarItem.show();
    }

    // Resolve the progress promise to close the notification
    if (this.progressResolve) {
      this.progressResolve();
      this.progressResolve = undefined;
      this.progressReject = undefined;
      this.progressPromise = undefined;
    }
  }

  showError(message: string): void {
    // Reject the progress promise to close the notification with an error
    if (this.progressReject) {
      this.progressReject(new Error(message));
      this.progressResolve = undefined;
      this.progressReject = undefined;
      this.progressPromise = undefined;
    }
    
    // Show error message
    vscode.window.showErrorMessage(`Commit Message Generator: ${message}`);
  }

  showInfo(message: string): void {
    // Resolve the progress promise to close the notification
    if (this.progressResolve) {
      this.progressResolve();
      this.progressResolve = undefined;
      this.progressReject = undefined;
      this.progressPromise = undefined;
    }
    
    // Show info message
    vscode.window.showInformationMessage(`Commit Message Generator: ${message}`);
  }

  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
    // Make sure to resolve any pending progress
    if (this.progressResolve) {
      this.progressResolve();
    }
  }
}