import * as vscode from 'vscode';
import FirecrawlApp, { CrawlParams, CrawlResponse, CrawlStatusResponse } from '@mendable/firecrawl-js';
import { Configuration } from '../configuration';

export interface CrawlOptions extends CrawlParams {
    url: string;
}

interface Document {
    url?: string;
    title?: string;
    content?: string;
    links?: string[];
}

export interface CrawlResult {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    url: string;
    pages: {
        url: string;
        title: string;
        content: string;
        links: string[];
    }[];
}

export class FirecrawlClient {
    private static instance: FirecrawlClient;
    private app: FirecrawlApp;

    private constructor(apiKey: string) {
        this.app = new FirecrawlApp({ apiKey });
    }

    public static getInstance(): FirecrawlClient {
        const apiKey = Configuration.getApiKey();
        if (!apiKey) {
            throw new Error('API key not configured');
        }

        if (!FirecrawlClient.instance) {
            FirecrawlClient.instance = new FirecrawlClient(apiKey);
        }

        return FirecrawlClient.instance;
    }

    public async startCrawl(options: CrawlOptions): Promise<string> {
        try {
            const response = await this.app.asyncCrawlUrl(options.url, {
                ...options,
                scrapeOptions: {
                    formats: ['markdown'],
                }
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to start crawl');
            }

            return (response as CrawlResponse & { crawlId: string }).crawlId;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            void vscode.window.showErrorMessage(`Failed to start crawl: ${errorMessage}`);
            throw error;
        }
    }

    public async getCrawlStatus(crawlId: string): Promise<CrawlResult> {
        try {
            const response = await this.app.checkCrawlStatus(crawlId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to get crawl status');
            }

            // Extract documents from response, with type safety
            const statusResponse = response as CrawlStatusResponse & { 
                documents?: Document[];
                url?: string;
            };

            // Convert SDK response to our internal format
            return {
                id: crawlId,
                status: statusResponse.status as 'pending' | 'completed' | 'failed',
                url: statusResponse.url || '',
                pages: (statusResponse.documents || []).map(doc => ({
                    url: doc.url || '',
                    title: doc.title || '',
                    content: doc.content || '',
                    links: doc.links || []
                }))
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            void vscode.window.showErrorMessage(`Failed to get crawl status: ${errorMessage}`);
            throw error;
        }
    }

    public async stopCrawl(crawlId: string): Promise<void> {
        try {
            const response = await this.app.cancelCrawl(crawlId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to stop crawl');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            void vscode.window.showErrorMessage(`Failed to stop crawl: ${errorMessage}`);
            throw error;
        }
    }

    public watchCrawl(url: string, options: CrawlOptions) {
        return this.app.crawlUrlAndWatch(url, {
            ...options,
            scrapeOptions: {
                formats: ['markdown'],
            }
        });
    }

    /**
     * List crawls is not currently supported by the Firecrawl SDK.
     * This is a placeholder for future SDK versions.
     * 
     * @throws {Error} Always throws 'Method not implemented' error
     */
    public async listCrawls(): Promise<{ crawls: CrawlResult[], total: number }> {
        throw new Error('Method not implemented in Firecrawl SDK');
    }
}
