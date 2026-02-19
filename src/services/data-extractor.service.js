const fs = require('fs');
const path = require('path');

/**
 * Data Extractor Service
 * Extracts structured data from scraped HTML content without AI
 */
class DataExtractorService {
  /**
   * Extract structured data from scraped pages
   */
  extractData(scrapedData) {
    const extracted = {
      companyName: '',
      description: '',
      services: [],
      pricing: [],
      contactInfo: {},
      operatingHours: '',
      faqs: [],
      additionalInfo: []
    };

    if (!scrapedData || scrapedData.length === 0) {
      return extracted;
    }

    // Process each page
    scrapedData.forEach(page => {
      const content = page.content;
      if (!content) return;

      // Extract company name from first page
      if (!extracted.companyName && content.title) {
        extracted.companyName = content.title;
      }

      // Extract description
      if (!extracted.description) {
        if (content.metaDescription) {
          extracted.description = content.metaDescription;
        } else if (content.paragraphs && content.paragraphs.length > 0) {
          extracted.description = content.paragraphs[0].substring(0, 200);
        }
      }

      // Extract services from headings and content
      this.extractServices(content, extracted);

      // Extract contact information
      this.extractContactInfo(content, extracted);

      // Extract pricing information
      this.extractPricing(content, extracted);

      // Extract FAQs
      this.extractFAQs(content, extracted);

      // Extract additional info
      this.extractAdditionalInfo(content, extracted);
    });

    // Clean and deduplicate
    this.cleanData(extracted);

    return extracted;
  }

  /**
   * Extract services from content
   */
  extractServices(content, extracted) {
    // Look for service-related headings
    const serviceKeywords = ['service', 'laundry', 'dry clean', 'cleaning', 'ironing', 'wash'];
    
    if (content.headings) {
      // Check H2 headings for services
      if (content.headings.h2) {
        content.headings.h2.forEach(heading => {
          const headingLower = heading.toLowerCase();
          if (serviceKeywords.some(keyword => headingLower.includes(keyword)) && 
              heading.length > 5 && heading.length < 100) {
            // Check if already exists
            const exists = extracted.services.some(s => 
              s.name.toLowerCase() === heading.toLowerCase()
            );
            if (!exists) {
              extracted.services.push({
                name: heading,
                description: this.findDescriptionForHeading(heading, content),
                pricing: this.findPricingForService(heading, content)
              });
            }
          }
        });
      }

      // Check H1 headings
      if (content.headings.h1) {
        content.headings.h1.forEach(heading => {
          const headingLower = heading.toLowerCase();
          if (serviceKeywords.some(keyword => headingLower.includes(keyword)) && 
              heading.length > 5 && heading.length < 100) {
            const exists = extracted.services.some(s => 
              s.name.toLowerCase() === heading.toLowerCase()
            );
            if (!exists) {
              extracted.services.push({
                name: heading,
                description: this.findDescriptionForHeading(heading, content),
                pricing: this.findPricingForService(heading, content)
              });
            }
          }
        });
      }
    }

    // Extract from paragraphs if they mention services
    if (content.paragraphs) {
      content.paragraphs.forEach(para => {
        const paraLower = para.toLowerCase();
        if (serviceKeywords.some(keyword => paraLower.includes(keyword)) && 
            para.length > 20 && para.length < 300) {
          // Try to extract service name
          const serviceMatch = para.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:service|cleaning|laundry)/i);
          if (serviceMatch && serviceMatch[1]) {
            const serviceName = serviceMatch[1] + ' Service';
            const exists = extracted.services.some(s => 
              s.name.toLowerCase().includes(serviceName.toLowerCase())
            );
            if (!exists && extracted.services.length < 20) {
              extracted.services.push({
                name: serviceName,
                description: para.substring(0, 200),
                pricing: ''
              });
            }
          }
        }
      });
    }
  }

  /**
   * Find description for a heading
   */
  findDescriptionForHeading(heading, content) {
    if (!content.paragraphs) return '';
    
    // Find paragraph that mentions the heading
    for (const para of content.paragraphs) {
      if (para.toLowerCase().includes(heading.toLowerCase().substring(0, 10))) {
        return para.substring(0, 300);
      }
    }
    
    // Return first relevant paragraph
    if (content.paragraphs.length > 0) {
      return content.paragraphs[0].substring(0, 200);
    }
    
    return '';
  }

  /**
   * Find pricing for a service
   */
  findPricingForService(serviceName, content) {
    const pricePatterns = [
      /₹\s*(\d+)/g,
      /Rs\.?\s*(\d+)/gi,
      /(\d+)\s*rupees?/gi,
      /starting\s+at\s*₹?\s*(\d+)/gi,
      /from\s*₹?\s*(\d+)/gi
    ];

    const allText = [
      ...(content.paragraphs || []),
      ...(content.lists || []),
      content.bodyText || ''
    ].join(' ');

    for (const pattern of pricePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    return '';
  }

  /**
   * Extract contact information
   */
  extractContactInfo(content, extracted) {
    const allText = content.bodyText || '';
    
    // Phone patterns
    const phonePatterns = [
      /(\+91[\s-]?\d{10})/g,
      /(\d{10})/g,
      /(\+91[\s-]?\d{5}[\s-]?\d{5})/g
    ];

    for (const pattern of phonePatterns) {
      const match = allText.match(pattern);
      if (match && !extracted.contactInfo.phone) {
        extracted.contactInfo.phone = match[0].trim();
        break;
      }
    }

    // Email pattern
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emailMatch = allText.match(emailPattern);
    if (emailMatch && !extracted.contactInfo.email) {
      extracted.contactInfo.email = emailMatch[0];
    }

    // Address (look for common address keywords)
    const addressKeywords = ['address', 'location', 'near', 'city', 'street'];
    if (addressKeywords.some(keyword => allText.toLowerCase().includes(keyword))) {
      // Try to extract address-like text
      const addressMatch = allText.match(/(?:address|location)[:\s]+([^.\n]{20,100})/i);
      if (addressMatch && !extracted.contactInfo.address) {
        extracted.contactInfo.address = addressMatch[1].trim();
      }
    }
  }

  /**
   * Extract pricing information
   */
  extractPricing(content, extracted) {
    const pricePatterns = [
      /(?:₹|Rs\.?)\s*(\d+)/g,
      /(\d+)\s*(?:rupees?|rs)/gi
    ];

    const allText = content.bodyText || '';
    
    pricePatterns.forEach(pattern => {
      const matches = [...allText.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && extracted.pricing.length < 20) {
          extracted.pricing.push({
            item: 'Service',
            price: match[0].trim()
          });
        }
      });
    });
  }

  /**
   * Extract FAQs
   */
  extractFAQs(content, extracted) {
    // Look for question patterns
    const questionPatterns = [
      /(?:Q|Question)[:\s]+([^?\n]+)\?/gi,
      /([A-Z][^?]+\?)/g
    ];

    const allText = content.bodyText || '';
    
    questionPatterns.forEach(pattern => {
      const matches = [...allText.matchAll(pattern)];
      matches.forEach((match, index) => {
        if (match[1] && extracted.faqs.length < 20) {
          const question = match[1].trim();
          // Try to find answer in next few sentences
          const answer = this.findAnswer(question, allText);
          extracted.faqs.push({
            question: question,
            answer: answer || 'Please contact us for more information.'
          });
        }
      });
    });
  }

  /**
   * Find answer for a question
   */
  findAnswer(question, text) {
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const sentences = text.split(/[.!?]+/);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      if (questionWords.some(word => sentence.includes(word))) {
        // Return next few sentences as answer
        return sentences.slice(i, i + 3).join('. ').trim();
      }
    }
    
    return '';
  }

  /**
   * Extract additional information
   */
  extractAdditionalInfo(content, extracted) {
    // Extract key points from lists
    if (content.lists && content.lists.length > 0) {
      content.lists.slice(0, 10).forEach(item => {
        if (item.length > 10 && item.length < 200) {
          extracted.additionalInfo.push(item);
        }
      });
    }

    // Extract important paragraphs
    if (content.paragraphs) {
      content.paragraphs.slice(0, 5).forEach(para => {
        if (para.length > 50 && para.length < 300) {
          extracted.additionalInfo.push(para);
        }
      });
    }
  }

  /**
   * Clean and deduplicate data
   */
  cleanData(extracted) {
    // Remove duplicates from services
    const seenServices = new Set();
    extracted.services = extracted.services.filter(service => {
      const key = service.name.toLowerCase();
      if (seenServices.has(key)) {
        return false;
      }
      seenServices.add(key);
      return true;
    });

    // Remove duplicates from FAQs
    const seenFAQs = new Set();
    extracted.faqs = extracted.faqs.filter(faq => {
      const key = faq.question.toLowerCase();
      if (seenFAQs.has(key)) {
        return false;
      }
      seenFAQs.add(key);
      return true;
    });

    // Clean empty fields
    if (!extracted.companyName) extracted.companyName = 'Laundry Service';
    if (!extracted.description) extracted.description = 'Professional laundry and dry cleaning services';
  }
}

module.exports = new DataExtractorService();




