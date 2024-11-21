import * as vscode from 'vscode';

export class Configuration {
    private static readonly configSection = 'firedocs';
    private static context: vscode.ExtensionContext;
    private static readonly API_KEY = 'firecrawl.apiKey';
    private static readonly DOCS_PATH = 'firecrawl.docsPath';

    static initialize(context: vscode.ExtensionContext) {
        this.context = context;
    }

    static getApiKey(): string | undefined {
        return this.context.globalState.get<string>(this.API_KEY);
    }

    static async setApiKey(value: string): Promise<void> {
        await this.context.globalState.update(this.API_KEY, value);
    }

    static getDocsFolder(): string {
        return vscode.workspace.getConfiguration(this.configSection).get('docsFolder', 'docs');
    }

    static getAutoIndex(): boolean {
        return vscode.workspace.getConfiguration(this.configSection).get('autoIndex', true);
    }

    static getWorkspaceDocsPath(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }
        
        const docsFolder = this.getDocsFolder();
        return vscode.Uri.joinPath(workspaceFolders[0].uri, docsFolder).fsPath;
    }
}
