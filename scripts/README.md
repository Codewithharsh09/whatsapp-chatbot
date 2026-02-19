# Website Scraping Script

This script uses Gemini AI to scrape and extract data from your laundry company website.

## How It Works

1. **Scrapes Website**: Crawls your website pages and extracts content
2. **AI Processing**: Uses Gemini AI to structure and extract relevant information
3. **Saves Data**: Stores the processed data as JSON for the chatbot to use

## Usage

### Basic Usage

```bash
npm run scrape <your-website-url>
```

Example:
```bash
npm run scrape https://your-laundry-service.com
```

Or directly:
```bash
node scripts/scrape-website.js https://your-laundry-service.com
```

## Requirements

1. **Gemini API Key**: Must be set in your `.env` file
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Valid Website URL**: The website must be accessible and have content

## What Gets Extracted

The script extracts:
- Company name and description
- Services offered with pricing
- Contact information (phone, email, address)
- Operating hours
- FAQs
- Pricing information
- Any other relevant information

## Output

The processed data is saved to:
```
data/website-data-<timestamp>.json
```

The chatbot will automatically use the most recent website data file when responding to messages.

## Configuration

You can adjust scraping limits in `src/services/web-scraper.service.js`:
- `maxPages`: Maximum number of pages to scrape (default: 50)
- `maxDepth`: Maximum depth to crawl (default: 3)

## Notes

- The script respects robots.txt and only scrapes the same domain
- It skips images, PDFs, and other non-text content
- Processing may take a few minutes depending on website size
- Make sure you have permission to scrape the website

## Troubleshooting

**Error: "No data scraped"**
- Check if the URL is accessible
- Verify the website doesn't block scrapers
- Try a different URL format

**Error: "GEMINI_API_KEY is required"**
- Make sure your `.env` file has the Gemini API key
- Restart the script after adding the key

**Slow processing**
- Large websites take time to process
- Reduce `maxPages` or `maxDepth` for faster scraping




