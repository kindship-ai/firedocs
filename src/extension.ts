import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { DocumentationViewProvider } from './documentationView';
import { CrawlDialog } from './crawlDialog';
import { Crawler } from './crawler';

export function activate(context: vscode.ExtensionContext) {
    console.log('Firedocs extension is now active!');

    // Initialize configuration
    Configuration.initialize(context);

    // Initialize the documentation view
    const documentationProvider = new DocumentationViewProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('firedocsExplorer', documentationProvider)
    );

    // Register the command to configure API key
    const configureCommand = vscode.commands.registerCommand('firedocs.configure', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Firecrawl API key',
            password: true
        });

        if (apiKey) {
            await Configuration.setApiKey(apiKey);
            vscode.window.showInformationMessage('API key configured successfully!');
            documentationProvider.refresh();
        }
    });

    // Register the command to crawl documentation
    const crawlCommand = vscode.commands.registerCommand('firedocs.crawl', async () => {
        try {
            const result = await CrawlDialog.show();
            
            if (result) {
                await Crawler.crawl({
                    url: result.url,
                    subfolder: result.subfolder,
                    outputFolder: result.outputFolder
                });
                
                // Refresh the documentation view
                documentationProvider.refresh();
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to crawl documentation: ${error.message}`);
        }
    });

    // Register the command to view documentation
    const viewDocsCommand = vscode.commands.registerCommand('firedocs.viewDocs', async () => {
        const docsPath = Configuration.getWorkspaceDocsPath();
        if (!docsPath) {
            vscode.window.showErrorMessage('No documentation folder found.');
            return;
        }

        // TODO: Implement documentation viewing
        vscode.window.showInformationMessage('Documentation viewing will be implemented in the next phase');
    });

    // Add file system watcher for docs folder if auto-indexing is enabled
    if (Configuration.getAutoIndex()) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(Configuration.getDocsFolder(), '**/*')
        );

        watcher.onDidChange(() => documentationProvider.refresh());
        watcher.onDidCreate(() => documentationProvider.refresh());
        watcher.onDidDelete(() => documentationProvider.refresh());

        context.subscriptions.push(watcher);
    }

    context.subscriptions.push(configureCommand, crawlCommand, viewDocsCommand);
}

export function deactivate() {}
