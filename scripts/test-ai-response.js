require('dotenv').config();
const readline = require('readline');
const aiService = require('../src/services/ai.service');

// Configure readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('='.repeat(50));
console.log('WhatsApp Chatbot - AI Response Test');
console.log('='.repeat(50));
console.log('Type your message and press Enter to see how the AI responds.');
console.log('Type "exit" or "quit" to end the session.');
console.log('='.repeat(50));

// Check if API key is configured
if (!process.env.GEMINI_API_KEY) {
  console.error('\nError: GEMINI_API_KEY is not set in .env file.');
  console.error('Please configure your .env file before running this test.');
  process.exit(1);
}

// Function to prompt user
function askQuestion() {
  rl.question('\nYou: ', async (input) => {
    const message = input.trim();

    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log('\nExiting test. Goodbye!');
      rl.close();
      process.exit(0);
    }

    if (message === '') {
      askQuestion();
      return;
    }

    try {
      console.log('Bot is typing...');
      const response = await aiService.generateResponse(message);
      console.log(`\nBot: ${response}`);
    } catch (error) {
      console.error('\nError generating response:', error.message);
    }

    askQuestion();
  });
}

// Start the conversation
console.log('\nInitializing AI Service...');
try {
  // force initialization if needed, though the service does it in constructor
  // accessing the singleton instance triggers the constructor
  console.log('Ready! Say hello.');
  askQuestion();
} catch (error) {
  console.error('Failed to initialize AI Service:', error.message);
  process.exit(1);
}
