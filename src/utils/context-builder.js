const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Context Builder Utility
 * Loads company profile and builds context for Gemini AI prompts
 */
class ContextBuilder {
  constructor() {
    this.companyProfile = null;
    this.websiteData = null;
    this.loadCompanyProfile();
    this.loadWebsiteData();
  }

  /**
   * Load company profile from JSON file
   */
  loadCompanyProfile() {
    try {
      const profilePath = path.join(__dirname, '../../config/company-profile.json');
      const profileData = fs.readFileSync(profilePath, 'utf8');
      this.companyProfile = JSON.parse(profileData);
    } catch (error) {
      logger.error({ error }, 'Error loading company profile');
      throw new Error('Failed to load company profile');
    }
  }

  /**
   * Load website data from JSON file (if exists)
   */
  loadWebsiteData() {
    try {
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        return; // No data directory, skip
      }

      // Find the most recent website data file
      const files = fs.readdirSync(dataDir)
        .filter(file => file.startsWith('website-data-') && file.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first

      if (files.length > 0) {
        const latestFile = path.join(dataDir, files[0]);
        const websiteDataContent = fs.readFileSync(latestFile, 'utf8');
        this.websiteData = JSON.parse(websiteDataContent);
        logger.info({ file: files[0] }, 'Loaded website data');
      }
    } catch (error) {
      logger.warn({ error }, 'Could not load website data');
      // Don't throw error, website data is optional
    }
  }

  /**
   * Build system prompt with company context
   */
  buildSystemPrompt() {
    if (!this.companyProfile) {
      throw new Error('Company profile not loaded');
    }

    const profile = this.companyProfile;
    
    // Use website data if available, otherwise use company profile
    const companyName = this.websiteData?.companyName || profile.companyName;
    const description = this.websiteData?.description || profile.description;
    
    let prompt = `You are a helpful customer service representative for ${companyName}.

COMPANY INFORMATION:
${description}

SERVICES OFFERED:`;

    // Use website data services if available, otherwise use profile services
    const services = this.websiteData?.services || profile.services || [];
    services.forEach(service => {
      const name = service.name || 'Service';
      const desc = service.description || '';
      const price = service.pricing || 'Contact for pricing';
      prompt += `\n- ${name}: ${desc} (${price})`;
    });

    prompt += `\n\nOPERATING HOURS:`;
    Object.entries(profile.operatingHours).forEach(([day, hours]) => {
      prompt += `\n- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours}`;
    });

    // Use website data contact info if available
    const contactInfo = this.websiteData?.contactInfo || profile.contactInfo || {};
    prompt += `\n\nCONTACT INFORMATION:`;
    if (contactInfo.phone) prompt += `\n- Phone: ${contactInfo.phone}`;
    if (contactInfo.email) prompt += `\n- Email: ${contactInfo.email}`;
    if (contactInfo.address) prompt += `\n- Address: ${contactInfo.address}`;
    if (contactInfo.website) prompt += `\n- Website: ${contactInfo.website}`;

    // Add pickup/delivery information
    if (profile.pickupDelivery.available) {
      prompt += `\n\nPICKUP & DELIVERY:
- Available: Yes
- Areas: ${profile.pickupDelivery.areas.join(', ')}
- Pickup Fee: ${profile.pickupDelivery.pickupFee}
- Delivery Fee: ${profile.pickupDelivery.deliveryFee}
- Free Delivery: ${profile.pickupDelivery.freeDelivery}
- Scheduling: ${profile.pickupDelivery.scheduling}`;
    }

    prompt += `\n\nTURNAROUND TIME:
- Standard: ${profile.turnaroundTime.standard}
- Express: ${profile.turnaroundTime.express}
- Rush: ${profile.turnaroundTime.rush}`;

    prompt += `\n\nPAYMENT METHODS: ${profile.paymentMethods.join(', ')}`;

    // Add FAQs (merge website data and profile FAQs)
    const faqs = this.websiteData?.faqs || profile.faqs || [];
    if (faqs.length > 0) {
      prompt += `\n\nCOMMON QUESTIONS & ANSWERS:`;
      faqs.forEach(faq => {
        prompt += `\nQ: ${faq.question}\nA: ${faq.answer}`;
      });
    }

    // Add response guidelines
    prompt += `\n\nRESPONSE GUIDELINES:
- Tone: ${profile.responseGuidelines.tone}
- Style: ${profile.responseGuidelines.style}
- Always provide specific pricing when asked
- Guide customers through booking process
- Be friendly, helpful, and professional`;

    // Add special handling info
    prompt += `\n\nSPECIAL SERVICES:
- Delicate Items: ${profile.specialHandling.delicateItems}
- Stain Removal: ${profile.specialHandling.stainRemoval}
- Alterations: ${profile.specialHandling.alterations}`;

    prompt += `\n\nIMPORTANT NOTES:
- ${profile.disclaimers.damage}
- ${profile.disclaimers.valuables}
- ${profile.disclaimers.specialInstructions}`;

    // Add additional info from website if available
    if (this.websiteData?.additionalInfo && this.websiteData.additionalInfo.length > 0) {
      prompt += `\n\nADDITIONAL INFORMATION:`;
      this.websiteData.additionalInfo.forEach(info => {
        prompt += `\n- ${info}`;
      });
    }

    const contactPhone = contactInfo.phone || profile.contactInfo?.phone || 'the company';
    const contactEmail = contactInfo.email || profile.contactInfo?.email || 'the company';
    
    prompt += `\n\nYour role is to help customers with their laundry service needs. Answer their questions accurately based on the company information above. Be helpful, friendly, and professional. If you don't know something, politely direct them to contact the company directly at ${contactPhone} or ${contactEmail}.`;

    return prompt;
  }

  /**
   * Get company profile data
   */
  getCompanyProfile() {
    return this.companyProfile;
  }

  /**
   * Reload company profile (useful for updates)
   */
  reloadProfile() {
    this.loadCompanyProfile();
    this.loadWebsiteData();
  }

  /**
   * Get website data
   */
  getWebsiteData() {
    return this.websiteData;
  }
}

// Export singleton instance
module.exports = new ContextBuilder();

