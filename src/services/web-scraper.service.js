const axios = require('axios');
const cheerio = require('cheerio');
const urlParse = require('url-parse');
const fs = require('fs');
const path = require('path');

/**
 * Web Scraper Service
 * Scrapes website pages and extracts content
 */
class WebScraperService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.visitedUrls = new Set();
    this.scrapedData = [];
    this.maxPages = 50; // Limit to prevent infinite loops
    this.maxDepth = 3; // Maximum depth to crawl
  }

  /**
   * Normalize URL to handle relative and absolute paths
   */
  normalizeUrl(url, baseUrl) {
    try {
      const parsed = urlParse(url, baseUrl, true);
      return parsed.href.split('#')[0]; // Remove fragments
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if URL should be scraped
   */
  shouldScrape(url, baseUrl) {
    try {
      const urlObj = urlParse(url);
      const baseObj = urlParse(baseUrl);
      
      // Only scrape same domain
      if (urlObj.hostname !== baseObj.hostname) {
        return false;
      }

      // Skip common non-content URLs
      const skipPatterns = [
        /\.(jpg|jpeg|png|gif|svg|pdf|zip|exe|dmg)$/i,
        /mailto:/,
        /tel:/,
        /javascript:/,
        /#/,
      ];

      for (const pattern of skipPatterns) {
        if (pattern.test(url)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract text content from HTML
   */
  extractTextContent(html) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Extract main content
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').map((i, el) => $(el).text().trim()).get();
    const h2 = $('h2').map((i, el) => $(el).text().trim()).get();
    const paragraphs = $('p').map((i, el) => $(el).text().trim()).get().filter(p => p.length > 0);
    const lists = $('ul, ol').map((i, el) => {
      return $(el).find('li').map((j, li) => $(li).text().trim()).get();
    }).get();
    
    // Extract links
    const links = $('a[href]').map((i, el) => ({
      text: $(el).text().trim(),
      href: $(el).attr('href')
    })).get();

    // Extract all text content
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10k characters

    return {
      title,
      metaDescription,
      headings: {
        h1: h1,
        h2: h2
      },
      paragraphs: paragraphs.slice(0, 20), // Limit paragraphs
      lists: lists.slice(0, 10), // Limit lists
      links: links.slice(0, 20), // Limit links
      bodyText: bodyText.substring(0, 5000), // Limit body text
      wordCount: bodyText.split(/\s+/).length
    };
  }

  /**
   * Scrape a single page
   */
  async scrapePage(url) {
    try {
      if (this.visitedUrls.has(url)) {
        return null;
      }

      if (this.visitedUrls.size >= this.maxPages) {
        console.log(`Reached maximum pages limit (${this.maxPages})`);
        return null;
      }

      console.log(`Scraping: ${url}`);
      this.visitedUrls.add(url);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = response.data;
      const content = this.extractTextContent(html);
      
      const pageData = {
        url,
        scrapedAt: new Date().toISOString(),
        content
      };

      this.scrapedData.push(pageData);

      // Extract links for further crawling
      const $ = cheerio.load(html);
      const links = $('a[href]').map((i, el) => $(el).attr('href')).get();
      
      return {
        pageData,
        links: links.filter(link => link && this.shouldScrape(link, this.baseUrl))
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Crawl website starting from base URL
   */
  async crawlWebsite(startUrl, depth = 0) {
    if (depth > this.maxDepth) {
      return;
    }

    const normalizedUrl = this.normalizeUrl(startUrl, this.baseUrl);
    if (!normalizedUrl || !this.shouldScrape(normalizedUrl, this.baseUrl)) {
      return;
    }

    const result = await this.scrapePage(normalizedUrl);
    if (!result) {
      return;
    }

    // Crawl linked pages
    if (depth < this.maxDepth && result.links.length > 0) {
      for (const link of result.links.slice(0, 10)) { // Limit links per page
        const nextUrl = this.normalizeUrl(link, normalizedUrl);
        if (nextUrl && !this.visitedUrls.has(nextUrl)) {
          await this.crawlWebsite(nextUrl, depth + 1);
          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }

  /**
   * Start scraping process
   */
  async startScraping() {
    console.log(`Starting to scrape: ${this.baseUrl}`);
    console.log(`Max pages: ${this.maxPages}, Max depth: ${this.maxDepth}`);
    
    this.visitedUrls.clear();
    this.scrapedData = [];

    await this.crawlWebsite(this.baseUrl);

    console.log(`\nScraping completed!`);
    console.log(`Total pages scraped: ${this.scrapedData.length}`);
    
    return this.scrapedData;
  }

  /**
   * Get scraped data
   */
  getScrapedData() {
    return this.scrapedData;
  }
}

module.exports = WebScraperService;




