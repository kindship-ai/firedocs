import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentationViewProvider } from '../../documentationView';

suite('DocumentationViewProvider Test Suite', () => {
    vscode.window.showInformationMessage('Starting DocumentationViewProvider tests.');

    let provider: DocumentationViewProvider;

    setup(() => {
        provider = new DocumentationViewProvider();
    });

    test('getChildren should return empty array when no workspace', async () => {
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'No documentation available');
    });

    test('refresh should not throw', () => {
        assert.doesNotThrow(() => {
            provider.refresh();
        });
    });

    test('getTreeItem should return the same item', async () => {
        const children = await provider.getChildren();
        const firstChild = children[0];
        const treeItem = provider.getTreeItem(firstChild);
        assert.strictEqual(treeItem, firstChild);
    });
});
