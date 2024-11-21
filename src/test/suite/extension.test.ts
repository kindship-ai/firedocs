import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentationViewProvider } from '../../documentationView';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting Extension tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('firedocs');
        assert.notStrictEqual(extension, undefined);
    });

    test('Should register all commands', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('firedocs.crawl'));
        assert.ok(commands.includes('firedocs.configure'));
        assert.ok(commands.includes('firedocs.viewDocs'));
    });

    test('Should register tree view', () => {
        const provider = new DocumentationViewProvider();
        const treeView = vscode.window.createTreeView('firedocsExplorer', {
            treeDataProvider: provider
        });
        assert.notStrictEqual(treeView, undefined);
        treeView.dispose();
    });

    test('Configuration should be registered', () => {
        const config = vscode.workspace.getConfiguration('firedocs');
        assert.notStrictEqual(config, undefined);
        assert.strictEqual(typeof config.get('apiKey'), 'string');
        assert.strictEqual(typeof config.get('docsFolder'), 'string');
        assert.strictEqual(typeof config.get('autoIndex'), 'boolean');
    });
});
