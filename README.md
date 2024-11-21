# Firedocs

A VS Code extension that helps you manage and access documentation by crawling documentation websites using the firecrawl API.

## Features

- Crawl documentation websites and store them locally
- Secure API key management
- Local documentation storage in `/docs` folder
- Easy-to-use commands for managing documentation

## Requirements

- VS Code 1.84.0 or higher
- Firecrawl API key

## Getting Started

1. Install the extension
2. Use the command palette (Cmd+Shift+P) and run "Firedocs: Configure API Key"
3. Enter your Firecrawl API key when prompted
4. Use "Firedocs: Crawl Documentation" to start crawling documentation

## Commands

- `Firedocs: Configure API Key` - Set up your Firecrawl API key
- `Firedocs: Crawl Documentation` - Start crawling documentation

## Extension Settings

This extension contributes the following settings:

* `firedocs.apiKey`: Your Firecrawl API key (stored securely)

## Development

1. Clone the repository
2. Run `npm install`
3. Open in VS Code
4. Press F5 to start debugging

## License

MIT
