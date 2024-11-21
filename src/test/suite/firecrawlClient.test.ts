import * as assert from 'assert';
import { FirecrawlClient, CrawlOptions } from '../../api/firecrawlClient';
import { Configuration } from '../../configuration';
import * as sinon from 'sinon';

suite('FirecrawlClient Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let getApiKeyStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        // Use a real test API key for integration testing
        getApiKeyStub = sandbox.stub(Configuration, 'getApiKey').returns('test-api-key');
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getInstance creates singleton instance', () => {
        const client1 = FirecrawlClient.getInstance();
        const client2 = FirecrawlClient.getInstance();
        assert.strictEqual(client1, client2);
    });

    test('getInstance throws error when API key is not configured', () => {
        getApiKeyStub.returns(undefined);
        assert.throws(() => FirecrawlClient.getInstance(), /API key not configured/);
    });

    test('startCrawl initiates crawl for valid URL', async () => {
        const client = FirecrawlClient.getInstance();
        const options: CrawlOptions = {
            url: 'https://example.com'
        };
        const crawlId = await client.startCrawl(options);
        assert.ok(crawlId, 'Should return a valid crawl ID');
    });

    test('getCrawlStatus returns status for valid crawl ID', async () => {
        const client = FirecrawlClient.getInstance();
        // First start a crawl
        const options: CrawlOptions = {
            url: 'https://example.com'
        };
        const crawlId = await client.startCrawl(options);
        
        // Then check its status
        const status = await client.getCrawlStatus(crawlId);
        assert.ok(['pending', 'completed', 'failed'].includes(status.status), 
            'Should return a valid crawl status');
    });

    test('stopCrawl cancels ongoing crawl', async () => {
        const client = FirecrawlClient.getInstance();
        // First start a crawl
        const options: CrawlOptions = {
            url: 'https://example.com'
        };
        const crawlId = await client.startCrawl(options);
        
        // Then try to stop it
        await client.stopCrawl(crawlId);
        
        // Verify it was stopped
        const status = await client.getCrawlStatus(crawlId);
        assert.ok(['failed', 'completed'].includes(status.status), 
            'Crawl should be stopped');
    });

    test('watchCrawl provides progress updates', async () => {
        const client = FirecrawlClient.getInstance();
        const options: CrawlOptions = {
            url: 'https://example.com'
        };

        const watcher = await client.watchCrawl('https://example.com', options);
        assert.ok(watcher, 'Should return a watcher');
        
        // Test that we can subscribe to events
        watcher.addEventListener('document', (event: CustomEvent) => {
            assert.ok(event.detail, 'Should receive document updates');
        });
        
        watcher.addEventListener('done', (event: CustomEvent) => {
            assert.ok(event.detail, 'Should receive completion update');
        });

        watcher.addEventListener('error', (event: CustomEvent) => {
            assert.ok(event.detail, 'Should receive error updates');
        });
    });
});
