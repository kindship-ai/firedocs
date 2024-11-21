import * as vscode from 'vscode';
import { Configuration } from './configuration';

export class DocumentationViewProvider implements vscode.TreeDataProvider<DocumentationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DocumentationItem | undefined | null | void> = new vscode.EventEmitter<DocumentationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DocumentationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DocumentationItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DocumentationItem): Promise<DocumentationItem[]> {
        if (!element) {
            // Root level - show available documentation sets
            const docsPath = Configuration.getWorkspaceDocsPath();
            if (!docsPath) {
                return [];
            }

            // TODO: Implement actual documentation set discovery
            return [
                new DocumentationItem(
                    'No documentation available',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'firedocs.crawl',
                        title: 'Crawl Documentation',
                        tooltip: 'Click to crawl documentation'
                    }
                )
            ];
        }
        return [];
    }
}

class DocumentationItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }
}
