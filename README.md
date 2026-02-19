# WhatsApp Laundry Service Chatbot

A production-ready WhatsApp chatbot for laundry service companies using **Gupshup WhatsApp Business API** and **OpenRouter AI** for intelligent customer responses.

## 🏗️ Architecture

This project follows **clean architecture** principles with clear separation of concerns:

```
src/
├── controllers/          # HTTP request handlers (thin layer)
├── services/            # Business logic
├── integrations/        # External API integrations
│   └── gupshup/        # Gupshup WhatsApp API (isolated)
├── routes/              # Express route definitions
├── middleware/          # Cross-cutting concerns
│   ├── error-handler.middleware.js
│   ├── request-logger.middleware.js
│   ├── rate-limiter.middleware.js
│   └── validation.middleware.js
├── utils/               # Utility functions
│   ├── logger.js        # Structured logging (Pino)
│   ├── webhook-parser.js
│   ├── validators.js    # Joi validation schemas
│   └── context-builder.js
└── index.js            # Main server entry point
```

## ✨ Features

- 🤖 **AI-powered responses** using OpenRouter AI
- 💬 **Automatic message handling** via Gupshup webhooks
- 📋 **Company profile integration** with website scraping
- 🔒 **Production-ready security** (Helmet, CORS, rate limiting)
- 📊 **Structured logging** with Pino
- ✅ **Request validation** with Joi
- 🧪 **Unit tests** with Jest
- 🚀 **Horizontally scalable** (stateless design)
- 📱 **Multiple message types** (text, image, template, media, interactive)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Gupshup account with WhatsApp Business API access
- OpenRouter API key
- Server with HTTPS (required for webhooks)

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Gupshup WhatsApp Business API
GUPSHUP_API_KEY=your_gupshup_api_key_here
GUPSHUP_APP_NAME=your_gupshup_app_name_here
GUPSHUP_BASE_URL=https://api.gupshup.io/sm/api/v1
WEBHOOK_VERIFY_TOKEN=your_secure_webhook_verify_token_here
WEBHOOK_SECRET=your_webhook_secret_for_signature_verification_here

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Optional: CORS
CORS_ORIGIN=*

# Optional: Body Size Limit
BODY_SIZE_LIMIT=10mb
```

### 3. Customize Company Profile

Edit `config/company-profile.json` with your laundry service information:
- Services and pricing
- Operating hours
- Pickup/delivery information
- FAQs
- Contact information

### 4. Run the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 🔑 Getting API Keys

### Gupshup WhatsApp Business API

1. Sign up at [Gupshup](https://www.gupshup.io/)
2. Create a WhatsApp Business API app
3. Get your API key from the dashboard
4. Note your app name
5. Configure webhook URL: `https://your-domain.com/webhook/gupshup`
6. Set webhook verify token (use `WEBHOOK_VERIFY_TOKEN` from `.env`)

### OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign in and create an API key
3. Copy the API key to your `.env` file
4. Choose a model (free models available)

## 📡 API Endpoints

### Health & Readiness

**Health Check:**
```
GET /health
```
Returns service status and basic information.

**Readiness Check:**
```
GET /ready
```
Checks if service is ready to accept traffic (includes dependency checks).

### Webhook (Gupshup)

**Webhook Verification (GET):**
```
GET /webhook/gupshup?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```
Used by Gupshup to verify webhook URL during setup.

**Webhook Handler (POST):**
```
POST /webhook/gupshup
```
Receives incoming WhatsApp messages from Gupshup.

### Message Sending

**Send Text Message:**
```
POST /messages/text
Content-Type: application/json

{
  "to": "919876543210",
  "message": "Hello, this is a test message"
}
```

**Send Template Message:**
```
POST /messages/template
Content-Type: application/json

{
  "to": "919876543210",
  "templateName": "welcome_template",
  "params": ["John", "Welcome"]
}
```

**Send Media Message:**
```
POST /messages/media
Content-Type: application/json

{
  "to": "919876543210",
  "mediaType": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Optional caption"
}
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### Build and Run

```bash
docker build -t whatsapp-chatbot .
docker run -p 3000:3000 --env-file .env whatsapp-chatbot
```

### Docker Compose

```yaml
version: '3.8'

services:
  chatbot:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## ☁️ Cloud Deployment

### Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables from `.env`
6. Deploy

**Render Configuration:**
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

### AWS (EC2 / ECS)

**EC2 Deployment:**
```bash
# SSH into EC2 instance
ssh user@your-ec2-instance

# Clone repository
git clone your-repo-url
cd whatsapp-chatbot

# Install dependencies
npm install --production

# Set up PM2 or systemd
pm2 start src/index.js --name whatsapp-chatbot
```

**ECS with Fargate:**
1. Build Docker image and push to ECR
2. Create ECS task definition
3. Create ECS service
4. Configure load balancer with HTTPS
5. Set environment variables in task definition

### Google Cloud Platform (GCP)

**Cloud Run:**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/whatsapp-chatbot
gcloud run deploy whatsapp-chatbot \
  --image gcr.io/PROJECT_ID/whatsapp-chatbot \
  --platform managed \
  --region us-central1 \
  --set-env-vars="GUPSHUP_API_KEY=xxx,GUPSHUP_APP_NAME=xxx"
```

**App Engine:**
Create `app.yaml`:
```yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  PORT: 8080
  GUPSHUP_API_KEY: your_key
  GUPSHUP_APP_NAME: your_app
  # ... other env vars
```

### Environment Variables for Production

Ensure these are set in your production environment:
- `NODE_ENV=production`
- `GUPSHUP_API_KEY`
- `GUPSHUP_APP_NAME`
- `GUPSHUP_BASE_URL`
- `WEBHOOK_VERIFY_TOKEN`
- `WEBHOOK_SECRET`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Protection against abuse
- **Request Validation** - Input sanitization with Joi
- **Webhook Signature Verification** - Secure webhook handling
- **Body Size Limits** - Protection against large payloads
- **Error Handling** - No sensitive data leakage

## 📊 Monitoring

### Health Checks

Monitor these endpoints:
- `/health` - Basic health check
- `/ready` - Readiness check with dependency validation

### Logging

Structured JSON logs in production:
- Request/response logging
- Error tracking
- Performance metrics

### Recommended Monitoring

- Set up alerts for `/ready` endpoint failures
- Monitor error rates
- Track API response times
- Monitor Gupshup API usage
- Set up log aggregation (e.g., Datadog, New Relic)

## 🔧 Configuration

### Rate Limiting

Adjust in `.env`:
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100           # 100 requests per window
```

### Logging

Set log level:
```env
LOG_LEVEL=info  # debug, info, warn, error
```

### CORS

Configure allowed origins:
```env
CORS_ORIGIN=https://yourdomain.com,https://anotherdomain.com
```

## 🛠️ Development

### Project Structure

- **Controllers** - Handle HTTP requests/responses only
- **Services** - Business logic (message handling, AI integration)
- **Integrations** - External API clients (Gupshup isolated here)
- **Middleware** - Cross-cutting concerns (logging, errors, validation)
- **Utils** - Reusable utilities
- **Routes** - Express route definitions with validation

### Adding New Features

1. **New Integration**: Add to `src/integrations/`
2. **New Service**: Add to `src/services/`
3. **New Controller**: Add to `src/controllers/`
4. **New Route**: Add to `src/routes/` and register in `src/index.js`
5. **New Middleware**: Add to `src/middleware/`

### Code Style

- Follow SOLID principles
- Keep controllers thin
- Isolate external integrations
- Use dependency injection where possible
- Write tests for new features

## 🐛 Troubleshooting

### Webhook Not Receiving Messages

1. Verify webhook URL is accessible (HTTPS required)
2. Check Gupshup webhook configuration
3. Verify `WEBHOOK_VERIFY_TOKEN` matches
4. Check server logs for incoming requests
5. Test webhook verification endpoint manually

### Messages Not Sending

1. Verify Gupshup API key and app name
2. Check API rate limits
3. Review Gupshup service logs
4. Verify phone number format (digits only, no + or spaces)
5. Check Gupshup dashboard for message status

### AI Not Responding

1. Check OpenRouter API key is valid
2. Verify company profile is loaded correctly
3. Review AI service logs for errors
4. Check model availability
5. Verify API rate limits

### Health Check Failing

1. Check `/ready` endpoint for specific failures
2. Verify all environment variables are set
3. Check service dependencies
4. Review application logs

## 📝 License

ISC

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Verify API configurations
4. Check Gupshup and OpenRouter documentation

## 🚀 Next Steps

- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Add conversation history storage (optional)
- [ ] Implement human handoff for complex queries
- [ ] Add analytics and reporting
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling
- [ ] Add database for conversation history (optional)

---

**Built with ❤️ using clean architecture principles**
