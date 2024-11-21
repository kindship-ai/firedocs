import * as vscode from 'vscode';
import * as path from 'path';
import FirecrawlApp, { CrawlParams } from '@mendable/firecrawl-js';
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
            // Get domain and convert to lowercase
            return urlObj.hostname.toLowerCase()
                // Replace dots and underscores with hyphens
                .replace(/[._]/g, '-');
        } catch {
            this.log('Error parsing URL for domain folder', { url });
            return 'unknown-domain';
        }
    }

    private static generateFilename(url: string, title?: string): string {
        try {
            const urlObj = new URL(url);
            // Get path segments and filter out empty ones
            const segments = urlObj.pathname.split('/').filter(p => p);
            
            // For root URL with no title, return index.md
            if (segments.length === 0 && !title) {
                return 'index.md';
            }
            
            // Start with path segments
            let parts = segments;
            
            // Add sanitized title if available
            if (title) {
                const sanitizedTitle = title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
                    .trim()
                    .replace(/\s+/g, '-'); // Replace spaces with hyphens
                
                // For root URL with title, use just the title
                if (segments.length === 0) {
                    parts = [sanitizedTitle];
                } else {
                    parts.push(sanitizedTitle);
                }
            }
            
            // Join all parts with hyphens and ensure valid filename
            const filename = parts
                .join('-')
                .replace(/[^a-z0-9-]/g, '-') // Replace any remaining invalid chars with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
            
            // Add .md extension
            return `${filename}.md`;
        } catch (error) {
            this.log('Error generating filename', { url, title, error });
            return 'index.md';
        }
    }

    private static urlToPattern(url: string | undefined): string | undefined {
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
        
        // Get workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        // Parse starting URL
        const baseOutputUri = vscode.Uri.joinPath(
            workspaceFolders[0].uri,
            options.outputFolder,
            domainFolder
        );

        // Ensure output directory exists
        try {
            await vscode.workspace.fs.createDirectory(baseOutputUri);
            this.log('Created output directory', { path: baseOutputUri.fsPath });
        } catch (error) {
            this.log('Error creating output directory', {
                path: baseOutputUri.fsPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }

        // Check API key first
        const apiKey = Configuration.getApiKey();
        if (!apiKey) {
            throw new Error('API key not found. Please set your API key first.');
        }

        // Create Firecrawl app instance
        const app = new FirecrawlApp({ apiKey });

        // Generate URL pattern for subfolder restriction
        const pattern = this.urlToPattern(options.subfolder);
        
        // Prepare crawl options
        const crawlOptions: CrawlParams = {
            limit: 100, // Default limit to prevent excessive crawling
            scrapeOptions: {
                formats: ['markdown' as const]
            },
            includePaths: pattern ? [pattern] : undefined,
            allowBackwardLinks: false // Enforce URL hierarchy
        };

        this.log('Starting crawl with Firecrawl options', {
            startingUrl,
            pattern,
            crawlOptions
        });

        // Create progress window
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Crawling Documentation",
            cancellable: true
        }, async (progress) => {
            // Start crawling with WebSocket updates
            try {
                const watch = await app.crawlUrlAndWatch(startingUrl, crawlOptions);
                let crawledPages = 0;

                // Handle document events
                watch.addEventListener("document", async (doc: any) => {
                    const docData = doc.detail;
                    crawledPages++;
                    
                    // Update progress
                    progress.report({
                        message: `Crawled ${crawledPages} pages`,
                        increment: 1
                    });
                    
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

                    try {
                        // Get URL from metadata
                        const sourceUrl = docData.metadata?.sourceURL || docData.url;
                        if (!sourceUrl) {
                            throw new Error('No source URL found in metadata');
                        }

                        // Parse URL for path
                        const urlObj = new URL(sourceUrl);
                        
                        // Generate filename from source URL and title
                        const filename = this.generateFilename(
                            sourceUrl,
                            docData.metadata?.title
                        );
                        
                        // Generate content for this document
                        let content = '';
                        content += '---\n';
                        content += `source: ${sourceUrl}\n`;
                        content += `title: ${docData.metadata?.title || ''}\n`;
                        content += `description: ${docData.metadata?.description || ''}\n`;
                        content += `language: ${docData.metadata?.language || 'en'}\n`;
                        content += `crawl_date: ${new Date().toISOString()}\n`;
                        content += `path: ${docData.metadata?.path || urlObj.pathname}\n`;
                        content += '---\n\n';
                        content += docData.markdown + '\n\n';
                        
                        // Write file directly to base output directory
                        const fileUri = vscode.Uri.joinPath(baseOutputUri, filename);
                        const encoder = new TextEncoder();
                        try {
                            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
                            this.log('Saved document', {
                                url: docData.url,
                                filename,
                                path: fileUri.fsPath,
                                content: content.substring(0, 200) + '...' // Log first 200 chars for debugging
                            });
                        } catch (error) {
                            this.log('Error writing file', {
                                url: docData.url,
                                filename,
                                path: fileUri.fsPath,
                                error: error instanceof Error ? error.message : String(error)
                            });
                            throw error;
                        }
                    } catch (error) {
                        this.log('Error saving document', {
                            url: docData.url,
                            error: error instanceof Error ? error.message : String(error),
                            stack: error instanceof Error ? error.stack : undefined
                        });
                    }
                });

                // Handle error events
                watch.addEventListener("error", (error: any) => {
                    const errorData = error.detail;
                    this.log('Crawl error', {
                        error: errorData instanceof Error ? errorData.message : String(errorData),
                        stack: errorData instanceof Error ? errorData.stack : undefined
                    });
                    throw errorData;
                });

                // Handle completion
                await new Promise<void>((resolve) => {
                    watch.addEventListener("done", () => {
                        this.log('Crawl completed', {
                            totalPages: crawledPages,
                            outputFolder: `${options.outputFolder}/${domainFolder}`
                        });
                        
                        vscode.window.showInformationMessage(
                            `Documentation crawled successfully! ${crawledPages} pages saved to ${options.outputFolder}/${domainFolder}/`
                        );
                        resolve();
                    });
                });
            } catch (error) {
                this.log('Failed to start crawl', {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                throw error;
            }
        });
    }
}
