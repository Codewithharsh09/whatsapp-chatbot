require('dotenv').config();
const WebScraperService = require('../src/services/web-scraper.service');
const WebsiteDataProcessorService = require('../src/services/website-data-processor.service');

/**
 * Script to scrape website and process data with Gemini AI
 * Usage: node scripts/scrape-website.js <website-url>
 */

async function scrapeAndProcessWebsite(websiteUrl) {
  try {
    console.log('='.repeat(60));
    console.log('Website Scraper with Gemini AI');
    console.log('='.repeat(60));
    console.log(`Target URL: ${websiteUrl}\n`);

    // Step 1: Scrape website
    console.log('Step 1: Scraping website...');
    const scraper = new WebScraperService(websiteUrl);
    const scrapedData = await scraper.startScraping();

    if (scrapedData.length === 0) {
      console.error('No data scraped. Please check the URL and try again.');
      process.exit(1);
    }

    // Step 2: Process with Gemini AI
    console.log('\nStep 2: Processing data with Gemini AI...');
    const processor = new WebsiteDataProcessorService();
    const processedData = await processor.processScrapedData(scrapedData);

    // Step 3: Save to file
    console.log('\nStep 3: Saving processed data...');
    const filename = `website-data-${Date.now()}.json`;
    const filePath = processor.saveToFile(processedData, filename);

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('Scraping and Processing Complete!');
    console.log('='.repeat(60));
    console.log(`Pages scraped: ${scrapedData.length}`);
    console.log(`Services found: ${processedData.services?.length || 0}`);
    console.log(`FAQs found: ${processedData.faqs?.length || 0}`);
    console.log(`Data saved to: ${filePath}`);
    console.log('\nYou can now use this data in your chatbot!');
    console.log('='.repeat(60));

    return {
      success: true,
      filePath,
      data: processedData
    };
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get URL from command line argument
const websiteUrl = process.argv[2];

if (!websiteUrl) {
  console.error('Usage: node scripts/scrape-website.js <website-url>');
  console.error('Example: node scripts/scrape-website.js https://example-laundry.com');
  process.exit(1);
}

// Validate URL
try {
  new URL(websiteUrl);
} catch (error) {
  console.error('Invalid URL format. Please provide a valid URL starting with http:// or https://');
  process.exit(1);
}

// Run the scraper
scrapeAndProcessWebsite(websiteUrl);




