import * as vscode from 'vscode';

export interface CrawlDialogResult {
    url: string;
    subfolder?: string;
    outputFolder: string;
}

export class CrawlDialog {
    private static readonly defaultFolder = 'docs';

    static async show(): Promise<CrawlDialogResult | undefined> {
        // Create input boxes for each field with proper validation
        const url = await vscode.window.showInputBox({
            title: 'Documentation URL',
            prompt: 'Enter the starting point URL to begin crawling (e.g., https://docs.example.com/api/v1)',
            ignoreFocusOut: true,
            validateInput: (value) => {
                try {
                    new URL(value);
                    return null; // URL is valid
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (!url) {
            return undefined; // User cancelled
        }

        const subfolder = await vscode.window.showInputBox({
            title: 'Subfolder URL (Optional)',
            prompt: 'Enter parent URL to restrict crawling scope (e.g., https://docs.example.com) or leave empty for no restriction',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value) {
                    return null; // Empty is valid
                }
                try {
                    new URL(value);
                    if (!url.startsWith(value)) {
                        return 'Starting point URL must be under this parent URL';
                    }
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (subfolder === undefined) {
            return undefined; // User cancelled
        }

        const outputFolder = await vscode.window.showInputBox({
            title: 'Output Folder',
            prompt: 'Enter the output folder path',
            ignoreFocusOut: true,
            value: this.defaultFolder,
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Output folder cannot be empty';
                }
                // Add additional path validation if needed
                return null;
            }
        });

        if (!outputFolder) {
            return undefined; // User cancelled
        }

        return {
            url: url.trim(),
            subfolder: subfolder.trim() || undefined,
            outputFolder: outputFolder.trim()
        };
    }
}
