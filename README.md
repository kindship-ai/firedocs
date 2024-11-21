# Firedocs

A VS Code extension for crawling and storing documentation websites locally using [Firecrawl](https://firecrawl.dev).

## Features

- One-click documentation crawling
- Automatic folder structure preservation
- Real-time crawl progress tracking
- Markdown output with metadata
- Secure API key management
- Subfolder crawl support

## Installation

1. Install the extension from the VS Code Marketplace
2. Get your Firecrawl API key from [firecrawl.dev](https://firecrawl.dev)
3. Set your API key in VS Code settings

## Usage

1. Open the command palette (Cmd/Ctrl + Shift + P)
2. Type "Firedocs: Crawl Documentation"
3. Enter the documentation URL
4. Choose output folder (default: /docs)
5. Wait for crawling to complete

The extension will:
- Create a folder structure matching the documentation site
- Generate markdown files with metadata
- Show real-time crawling progress

## Example

```
docs/
  docs_example_com/
    getting-started/
      installation.md
      quickstart.md
    api-reference/
      v1/
        authentication.md
        endpoints.md
      v2/
        changes.md
    index.md
```

## Requirements

- VS Code 1.84.0 or higher
- Firecrawl API key

## Extension Settings

* `firedocs.apiKey`: Your Firecrawl API key
* `firedocs.defaultOutputFolder`: Default folder for documentation (default: "docs")

## Known Issues

See the [issue tracker](https://github.com/kindship-ai/firedocs/issues).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details.

## Release Notes

### 0.1.0

Initial release:
- Basic crawling functionality
- Folder structure preservation
- Real-time progress tracking
- Markdown output with metadata
- API key management
