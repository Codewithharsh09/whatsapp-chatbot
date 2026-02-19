const openRouterConfig = {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',

    // Default model
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',

    // List of free models to try as fallbacks (in order of preference)
    validModels: [
        'openai/gpt-5.2'
    ],

    /**
     * Validate that API key is present
     */
    validate() {
        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY is required in environment variables');
        }
        return true;
    }
};

module.exports = openRouterConfig;
