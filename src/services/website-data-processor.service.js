const geminiConfig = require('../../config/gemini.config');
const dataExtractor = require('./data-extractor.service');
const fs = require('fs');
const path = require('path');

/**
 * Website Data Processor Service
 * Uses Gemini AI to process and structure scraped website data
 */
class WebsiteDataProcessorService {
  constructor() {
    this.model = null;
    this.initialize();
  }

  /**
   * Initialize Gemini model
   */
  initialize() {
    try {
      geminiConfig.validate();
      this.model = geminiConfig.getModel();
      console.log(`Website Data Processor initialized with model: ${geminiConfig.model}`);
    } catch (error) {
      console.error('Error initializing Website Data Processor:', error);
      console.error('Please check your GEMINI_API_KEY and GEMINI_MODEL in .env file');
      console.error(`Valid models: ${geminiConfig.validModels.join(', ')}`);
      throw error;
    }
  }

  /**
   * Process scraped data with Gemini AI to extract structured information
   */
  async processScrapedData(scrapedData) {
    try {
      console.log('\nProcessing scraped data with Gemini AI...');
      
      const structuredData = {
        companyInfo: {},
        services: [],
        pricing: [],
        contactInfo: {},
        faqs: [],
        otherInfo: []
      };

      let successCount = 0;
      let errorCount = 0;

      // Process each page
      for (let i = 0; i < scrapedData.length; i++) {
        const page = scrapedData[i];
        console.log(`Processing page ${i + 1}/${scrapedData.length}: ${page.url}`);

        try {
          const processedPage = await this.processPage(page);
          
          // Merge processed data
          if (processedPage && Object.keys(processedPage).length > 0) {
            this.mergeProcessedData(structuredData, processedPage);
            successCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing page ${page.url}:`, error.message);
          // Continue with next page instead of stopping
        }
      }

      console.log(`\nProcessing summary: ${successCount} pages processed successfully, ${errorCount} errors`);

      // If we have some data, try to finalize it
      let finalData = structuredData;
      if (successCount > 0 || Object.keys(structuredData).some(key => {
        const value = structuredData[key];
        return Array.isArray(value) ? value.length > 0 : Object.keys(value || {}).length > 0;
      })) {
        try {
          finalData = await this.finalizeData(structuredData);
        } catch (error) {
          console.warn('Warning: Could not finalize data with AI, using raw structured data:', error.message);
          // Use structured data as fallback
          finalData = structuredData;
        }
      } else {
        console.warn('Warning: No data was extracted with AI. Using intelligent extraction from scraped content.');
        // Use intelligent extraction without AI
        finalData = dataExtractor.extractData(scrapedData);
        console.log(`Extracted ${finalData.services.length} services, ${finalData.faqs.length} FAQs using intelligent parsing.`);
      }
      
      return finalData;
    } catch (error) {
      console.error('Error processing scraped data:', error);
      console.log('Using intelligent extraction as fallback...');
      // Use intelligent extraction as fallback
      return dataExtractor.extractData(scrapedData);
    }
  }

  /**
   * Process a single page with Gemini
   */
  async processPage(pageData) {
    try {
      const prompt = `You are analyzing a laundry service company website page. Extract and structure the following information from the page content:

URL: ${pageData.url}

Page Content:
Title: ${pageData.content.title}
Description: ${pageData.content.metaDescription}
Headings: ${JSON.stringify(pageData.content.headings)}
Main Text: ${pageData.content.bodyText.substring(0, 3000)}

Please extract and return ONLY a JSON object with the following structure (fill only relevant fields):
{
  "companyName": "company name if found",
  "description": "brief company description",
  "services": [
    {
      "name": "service name",
      "description": "service description",
      "pricing": "pricing information if available"
    }
  ],
  "pricing": [
    {
      "item": "item name",
      "price": "price information"
    }
  ],
  "contactInfo": {
    "phone": "phone number if found",
    "email": "email if found",
    "address": "address if found",
    "website": "website URL"
  },
  "faqs": [
    {
      "question": "question text",
      "answer": "answer text"
    }
  ],
  "operatingHours": "operating hours if found",
  "otherInfo": ["any other relevant information"]
}

Return ONLY the JSON object, no additional text.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      return {};
    } catch (error) {
      console.error(`Error processing page ${pageData.url}:`, error);
      return {};
    }
  }

  /**
   * Merge processed page data into main structure
   */
  mergeProcessedData(structuredData, processedPage) {
    // Merge company info
    if (processedPage.companyName && !structuredData.companyInfo.name) {
      structuredData.companyInfo.name = processedPage.companyName;
    }
    if (processedPage.description && !structuredData.companyInfo.description) {
      structuredData.companyInfo.description = processedPage.description;
    }

    // Merge services (avoid duplicates)
    if (processedPage.services && Array.isArray(processedPage.services)) {
      processedPage.services.forEach(service => {
        const exists = structuredData.services.some(s => 
          s.name && service.name && s.name.toLowerCase() === service.name.toLowerCase()
        );
        if (!exists && service.name) {
          structuredData.services.push(service);
        }
      });
    }

    // Merge pricing
    if (processedPage.pricing && Array.isArray(processedPage.pricing)) {
      structuredData.pricing.push(...processedPage.pricing);
    }

    // Merge contact info
    if (processedPage.contactInfo) {
      Object.keys(processedPage.contactInfo).forEach(key => {
        if (processedPage.contactInfo[key] && !structuredData.contactInfo[key]) {
          structuredData.contactInfo[key] = processedPage.contactInfo[key];
        }
      });
    }

    // Merge FAQs
    if (processedPage.faqs && Array.isArray(processedPage.faqs)) {
      structuredData.faqs.push(...processedPage.faqs);
    }

    // Merge other info
    if (processedPage.otherInfo && Array.isArray(processedPage.otherInfo)) {
      structuredData.otherInfo.push(...processedPage.otherInfo);
    }

    if (processedPage.operatingHours) {
      structuredData.companyInfo.operatingHours = processedPage.operatingHours;
    }
  }

  /**
   * Finalize and consolidate all data
   */
  async finalizeData(structuredData) {
    try {
      const prompt = `You are consolidating information extracted from a laundry service company website. 

Here is the extracted data:
${JSON.stringify(structuredData, null, 2)}

Please consolidate, deduplicate, and structure this into a clean JSON format suitable for a chatbot knowledge base. Return ONLY a JSON object with this structure:

{
  "companyName": "company name",
  "description": "company description",
  "services": [
    {
      "name": "service name",
      "description": "service description",
      "pricing": "pricing info"
    }
  ],
  "pricing": [
    {
      "item": "item",
      "price": "price"
    }
  ],
  "contactInfo": {
    "phone": "phone",
    "email": "email",
    "address": "address",
    "website": "website"
  },
  "operatingHours": "operating hours",
  "faqs": [
    {
      "question": "question",
      "answer": "answer"
    }
  ],
  "additionalInfo": ["any other relevant info"]
}

Return ONLY the JSON object, no additional text.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      // Fallback to structured data if JSON parsing fails
      return structuredData;
    } catch (error) {
      console.error('Error finalizing data:', error);
      return structuredData;
    }
  }

  /**
   * Create basic structure from scraped data when AI processing fails
   */
  createBasicStructure(scrapedData) {
    const basicData = {
      companyName: '',
      description: '',
      services: [],
      pricing: [],
      contactInfo: {},
      operatingHours: '',
      faqs: [],
      additionalInfo: []
    };

    // Extract basic info from first page
    if (scrapedData.length > 0) {
      const firstPage = scrapedData[0];
      if (firstPage.content) {
        basicData.companyName = firstPage.content.title || '';
        basicData.description = firstPage.content.metaDescription || firstPage.content.bodyText.substring(0, 200) || '';
        
        // Extract potential services from headings
        if (firstPage.content.headings && firstPage.content.headings.h2) {
          firstPage.content.headings.h2.forEach(heading => {
            if (heading.toLowerCase().includes('service') || heading.toLowerCase().includes('laundry')) {
              basicData.services.push({
                name: heading,
                description: '',
                pricing: ''
              });
            }
          });
        }
      }
    }

    return basicData;
  }

  /**
   * Save processed data to JSON file
   */
  saveToFile(data, filename = 'website-data.json') {
    try {
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`\n✓ Data saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Error saving data to file:', error);
      throw error;
    }
  }
}

module.exports = WebsiteDataProcessorService;

