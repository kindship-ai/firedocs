import * as vscode from 'vscode';
import * as path from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { Configuration } from './configuration';

interface CrawlOptions {
    url: string;
    subfolder?: string;
    outputFolder: string;
}

export class Crawler {
    // Create debug output channel
    private static debugChannel = vscode.window.createOutputChannel("Firedocs Debug");

    private static log(message: string, data?: any) {
        const timestamp = new Date().toISOString();
        this.debugChannel.appendLine(`[${timestamp}] ${message}`);
        if (data) {
            this.debugChannel.appendLine(JSON.stringify(data, null, 2));
        }
    }

    private static getRelativePath(url: string): string {
        try {
            const urlObj = new URL(url);
            // Get all path segments
            const parts = urlObj.pathname.split('/').filter(p => p);
            
            // If no path segments, return index
            if (parts.length === 0) {
                return 'index';
            }
            
            // Return the full path
            return parts.join('/');
        } catch {
            return 'index';
        }
    }

    private static getDomainFolder(url: string): string {
        try {
            const urlObj = new URL(url);
            // Convert domain to safe folder name, removing any non-alphanumeric chars
            return urlObj.hostname.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        } catch {
            return 'unknown_domain';
        }
    }

    private static generateFilename(url: string): string {
        try {
            // Get the full path from URL
            const relativePath = this.getRelativePath(url);
            
            // Add .md extension
            return `${relativePath}.md`;
        } catch {
            return 'index.md';
        }
    }

    private static urlToPattern(url: string): string | undefined {
        if (!url) return undefined;
        try {
            const urlObj = new URL(url);
            // Get the path segments, keeping only non-empty ones
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            
            // For root URLs (no path segments), return "/*" to match all paths
            if (pathParts.length === 0) {
                return '/*';
            }
            
            // For URLs with path segments, create pattern with single leading slash and wildcard
            const pattern = `/${pathParts[0]}/*`;
            
            this.log('Generated URL pattern', {
                originalUrl: url,
                pathParts,
                pattern,
                pathname: urlObj.pathname
            });
            return pattern;
        } catch (error) {
            this.log('Failed to generate URL pattern', {
                url,
                error: error instanceof Error ? error.message : String(error)
            });
            return undefined;
        }
    }

    static async crawl(options: CrawlOptions): Promise<void> {
        this.debugChannel.show();
        this.log('Starting crawl with options', options);

        // Use subfolder as starting URL if provided
        const startingUrl = options.subfolder || options.url;
        
        // Get domain folder name for organization
        const domainFolder = this.getDomainFolder(startingUrl);
        
        // Create base output folder structure
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        
        // Create the base output folder structure: output_folder/domain_name/
        const baseOutputUri = vscode.Uri.joinPath(
            workspaceFolders[0].uri,
            options.outputFolder,
            domainFolder
        );
        await vscode.workspace.fs.createDirectory(baseOutputUri);
        
        // Check API key first
        const apiKey = Configuration.getApiKey();
        if (!apiKey) {
            this.log('No API key found, prompting user');
            // Show API key configuration dialog
            const newApiKey = await vscode.window.showInputBox({
                prompt: 'Please enter your Firecrawl API key',
                password: true,
                ignoreFocusOut: true,
                placeHolder: 'Enter API key...'
            });

            if (!newApiKey) {
                throw new Error('API key is required to crawl documentation');
            }

            // Save the new API key
            await Configuration.setApiKey(newApiKey);
            this.log('New API key saved');
        }

        // Create progress window
        const progress = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Crawling Documentation",
            cancellable: true
        }, async (progress, token) => {
            try {
                // Initialize Firecrawl with current API key
                const currentApiKey = Configuration.getApiKey();
                if (!currentApiKey) {
                    throw new Error('API key not found');
                }

                const app = new FirecrawlApp({ apiKey: currentApiKey });
                let crawledPages = 0;
                let totalPages = 0;

                // Convert subfolder URL to pattern if provided
                const pattern = options.subfolder ? this.urlToPattern(options.subfolder) : undefined;

                // Set up crawl options
                const crawlOptions: any = {
                    scrapeOptions: {
                        formats: ['markdown']
                    },
                    includePaths: pattern ? [pattern] : undefined
                };

                this.log('Configured crawl options', {
                    startingUrl,
                    subfolder: options.subfolder,
                    pattern,
                    crawlOptions
                });

                try {
                    // Start crawling with WebSocket updates
                    this.log('Starting WebSocket crawl');
                    const watch = await app.crawlUrlAndWatch(startingUrl, crawlOptions);

                    // Handle document events
                    watch.addEventListener("document", async (doc: any) => {
                        const docData = doc.detail;
                        crawledPages++;
                        
                        this.log('Received document', {
                            url: docData.url,
                            title: docData.metadata?.title,
                            path: docData.metadata?.path,
                            structure: docData.metadata?.structure,
                            parentPath: docData.metadata?.parentPath,
                            section: docData.metadata?.section,
                            fullMetadata: JSON.stringify(docData.metadata, null, 2),
                            crawledPages
                        });

                        // Generate content for this document
                        let content = '';
                        content += '---\n';
                        content += `source: ${docData.url}\n`;
                        content += `title: ${docData.metadata?.title || ''}\n`;
                        content += `description: ${docData.metadata?.description || ''}\n`;
                        content += `language: ${docData.metadata?.language || 'en'}\n`;
                        content += `crawl_date: ${new Date().toISOString()}\n`;
                        content += '---\n\n';
                        content += docData.markdown + '\n\n';

                        try {
                            // Generate filename from source URL
                            const relativeFile = this.generateFilename(docData.metadata?.sourceURL || docData.url);
                            
                            // Create parent directories if needed
                            const dirs = relativeFile.split('/');
                            if (dirs.length > 1) {
                                const parentDirs = dirs.slice(0, -1).join('/');
                                const parentUri = vscode.Uri.joinPath(baseOutputUri, parentDirs);
                                await vscode.workspace.fs.createDirectory(parentUri);
                            }
                            
                            const fileUri = vscode.Uri.joinPath(baseOutputUri, relativeFile);

                            this.log('Writing document file', {
                                outputFolder: options.outputFolder,
                                domain: domainFolder,
                                relativePath: relativeFile,
                                fullPath: fileUri.fsPath,
                                title: docData.metadata?.title,
                                contentLength: content.length
                            });

                            // Write content to file
                            const encoder = new TextEncoder();
                            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));

                            // Update progress
                            progress.report({
                                message: `Crawled ${crawledPages} pages`,
                                increment: 1
                            });
                        } catch (error) {
                            this.log('Error writing document file', {
                                error: error instanceof Error ? error.message : String(error),
                                stack: error instanceof Error ? error.stack : undefined
                            });
                            throw error;
                        }
                    });

                    // Handle errors
                    watch.addEventListener("error", async (err: any) => {
                        const error = err.detail.error;
                        this.log('Received error event', {
                            error: error
                        });
                        if (error instanceof Error && error.message.includes('api_key')) {
                            // Clear invalid API key
                            await Configuration.setApiKey('');
                            throw new Error('Invalid API key. Please reconfigure your API key.');
                        }
                        throw new Error(String(error));
                    });

                    // Handle completion
                    await new Promise<void>((resolve, reject) => {
                        watch.addEventListener("done", async (state: any) => {
                            this.log('Received done event', {
                                state,
                                crawledPages
                            });
                            
                            vscode.window.showInformationMessage(
                                `Documentation crawled successfully! ${crawledPages} pages saved to ${options.outputFolder}/${domainFolder}/`
                            );
                            resolve();
                        });
                    });

                } catch (error) {
                    this.log('Crawl error', {
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    if (error instanceof Error && error.message.includes('api_key')) {
                        // Clear invalid API key
                        await Configuration.setApiKey('');
                        throw new Error('Invalid API key. Please reconfigure your API key.');
                    }
                    throw error;
                }
            } catch (error) {
                this.log('Fatal error', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                vscode.window.showErrorMessage(`Crawl failed: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        });

        return progress;
    }
}
