import * as assert from 'assert';
import * as vscode from 'vscode';
import { Configuration } from '../../configuration';

suite('Configuration Test Suite', () => {
    vscode.window.showInformationMessage('Starting Configuration tests.');

    test('getApiKey should return undefined when not set', () => {
        const apiKey = Configuration.getApiKey();
        assert.strictEqual(apiKey, undefined);
    });

    test('getDocsFolder should return default value', () => {
        const docsFolder = Configuration.getDocsFolder();
        assert.strictEqual(docsFolder, 'docs');
    });

    test('getAutoIndex should return default value', () => {
        const autoIndex = Configuration.getAutoIndex();
        assert.strictEqual(autoIndex, true);
    });

    test('getWorkspaceDocsPath should return undefined when no workspace', () => {
        const docsPath = Configuration.getWorkspaceDocsPath();
        assert.strictEqual(docsPath, undefined);
    });

    test('setApiKey should update configuration', async () => {
        const testKey = 'test-api-key';
        await Configuration.setApiKey(testKey);
        const apiKey = Configuration.getApiKey();
        assert.strictEqual(apiKey, testKey);
        
        // Clean up
        await Configuration.setApiKey('');
    });
});
