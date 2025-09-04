import * as vscode from 'vscode';

export class UIController {
  private progressDisposable: vscode.Disposable | undefined;
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

    // Create a disposable for the progress
    this.progressDisposable = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating commit message',
        cancellable: true
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => {
          this.hideProgress();
        });
        
        // Keep the progress alive until hidden
        return new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (!this.progressDisposable) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      }
    ) as unknown as vscode.Disposable;
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

    if (this.progressDisposable) {
      this.progressDisposable.dispose();
      this.progressDisposable = undefined;
    }
  }

  showError(message: string): void {
    // Hide progress first
    this.hideProgress();
    
    // Show error message
    vscode.window.showErrorMessage(`Commit Message Generator: ${message}`);
  }

  showInfo(message: string): void {
    // Hide progress first
    this.hideProgress();
    
    // Show info message
    vscode.window.showInformationMessage(`Commit Message Generator: ${message}`);
  }

  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
    if (this.progressDisposable) {
      this.progressDisposable.dispose();
    }
  }
}