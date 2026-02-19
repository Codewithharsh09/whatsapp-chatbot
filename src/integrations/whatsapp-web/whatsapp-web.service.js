const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../../utils/logger');
const messageHandlerService = require('../../services/message-handler.service');

/**
 * WhatsApp-Web Integration Service
 * Uses standard WhatsApp account via QR code scanning
 */
class WhatsAppWebService {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        });

        this.initializeEvents();
    }

    /**
     * Initialize event handlers
     */
    initializeEvents() {
        // When the client is authenticated
        this.client.on('authenticated', () => {
            logger.info('WhatsApp-Web Client authenticated successfully!');
            console.log('AUTHENTICATED');
        });

        // When the client is ready
        this.client.on('ready', () => {
            logger.info('WhatsApp-Web Client is ready!');
            console.log('CLIENT READY');
        });

        // Handle QR Code
        this.client.on('qr', (qr) => {
            logger.info('QR Code received, please scan with WhatsApp');

            // Generate a clickable link for cloud logs where ASCII might break
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;

            console.log('\n--- SCAN THIS QR CODE ---');
            console.log('Link: ' + qrImageUrl);
            console.log('-------------------------\n');

            qrcode.generate(qr, { small: true });
        });

        // Handle Incoming Messages
        this.client.on('message_create', async (message) => {
            // Don't respond to our own messages or group messages (optional filter)
            if (message.fromMe) return;

            try {
                logger.info({ from: message.from, body: message.body }, 'Received message via WhatsApp-Web');

                const messageData = {
                    from: message.from,
                    message: message.body,
                    messageType: 'text',
                    messageId: message.id.id
                };

                // Pass a custom reply handler to messageHandlerService
                await messageHandlerService.processMessageSync(messageData, async (to, responseText) => {
                    await this.client.sendMessage(to, responseText);
                });

            } catch (error) {
                logger.error({ error, message: message.body }, 'Error processing WhatsApp-Web message');
            }
        });

        // Handle authentication failure
        this.client.on('auth_failure', (msg) => {
            logger.error({ msg }, 'WhatsApp-Web Authentication failure');
            console.error('AUTHENTICATION FAILURE, RESTARTING...');
        });

        // Handle disconnection
        this.client.on('disconnected', (reason) => {
            logger.warn({ reason }, 'WhatsApp-Web Client was disconnected. Attempting to reconnect...');
            console.log('DISCONNECTED, RECONNECTING...');
            this.client.initialize();
        });
    }

    /**
     * Start the client
     */
    initialize() {
        logger.info('Initializing WhatsApp-Web Client...');
        this.client.initialize();
    }
}

module.exports = new WhatsAppWebService();
