# Website Scraping Guide

## Quick Start

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Gemini API Key
Make sure your `.env` file has:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Run the Scraper
```bash
npm run scrape https://your-laundry-service-website.com
```

Replace `https://your-laundry-service-website.com` with your actual website URL.

### Step 4: Wait for Processing
The script will:
1. Scrape your website pages
2. Extract content using Gemini AI
3. Structure the data
4. Save to `data/website-data-<timestamp>.json`

### Step 5: Restart Your Chatbot
After scraping, restart your chatbot server:
```bash
npm start
```

The chatbot will automatically use the scraped website data!

## Example

```bash
# Scrape your website
npm run scrape https://www.example-laundry.com

# Output will show:
# - Pages scraped
# - Services found
# - FAQs found
# - Data saved location

# Restart chatbot to use new data
npm start
```

## What Gets Extracted

- ✅ Company name and description
- ✅ Services with pricing
- ✅ Contact information (phone, email, address)
- ✅ Operating hours
- ✅ FAQs
- ✅ Pricing details
- ✅ Any other relevant information

## How It Works

1. **Web Scraper** (`src/services/web-scraper.service.js`)
   - Crawls your website
   - Extracts HTML content
   - Follows links within your domain

2. **AI Processor** (`src/services/website-data-processor.service.js`)
   - Uses Gemini AI to analyze scraped content
   - Extracts structured information
   - Organizes data into JSON format

3. **Context Builder** (`src/utils/context-builder.js`)
   - Automatically loads website data
   - Combines with company profile
   - Uses in chatbot responses

## Updating Website Data

When you update your website, simply re-run the scraper:

```bash
npm run scrape https://your-updated-website.com
```

The chatbot will automatically use the newest data file.

## Troubleshooting

**"No data scraped"**
- Check if URL is accessible
- Verify website doesn't block scrapers
- Try accessing the URL in a browser first

**"GEMINI_API_KEY is required"**
- Make sure `.env` file exists
- Verify API key is set correctly
- Restart after adding the key

**Slow processing**
- Large websites take time
- Reduce `maxPages` in `web-scraper.service.js` for faster scraping

## Configuration

Edit `src/services/web-scraper.service.js` to adjust:
- `maxPages`: Maximum pages to scrape (default: 50)
- `maxDepth`: Maximum crawl depth (default: 3)

## Notes

- Only scrapes same domain (for security)
- Skips images, PDFs, and binary files
- Respects website structure
- Processing time depends on website size




