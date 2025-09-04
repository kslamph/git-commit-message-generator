import * as vscode from 'vscode';

export class UIController {
  private progressDisposable: vscode.Disposable | undefined;

  showProgress(): void {
    // Create a disposable for the progress
    const disposable = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.SourceControl,
        title: 'Generating commit message',
        cancellable: false
      },
      async () => {
        // Progress will be handled by the extension
        // This just shows the progress indicator
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    );
    
    // Store the disposable
    this.progressDisposable = {
      dispose: () => {
        // In a real implementation, we would cancel the progress
        // For now, we just clear the reference
      }
    };
  }

  hideProgress(): void {
    if (this.progressDisposable) {
      this.progressDisposable.dispose();
      this.progressDisposable = undefined;
    }
  }

  showError(message: string): void {
    vscode.window.showErrorMessage(message);
  }

  showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }
}