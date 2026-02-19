# Deployment Guide

This guide provides detailed instructions for deploying the WhatsApp Chatbot to various platforms.

## Prerequisites

- Node.js 16+ installed locally (for testing)
- Git repository set up
- Environment variables configured
- HTTPS-enabled domain (required for webhooks)

## Environment Variables

Ensure all required environment variables are set:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

GUPSHUP_API_KEY=your_key
GUPSHUP_APP_NAME=your_app
GUPSHUP_BASE_URL=https://api.gupshup.io/sm/api/v1
WEBHOOK_VERIFY_TOKEN=your_token
WEBHOOK_SECRET=your_secret

OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
```

## Docker Deployment

### Build Image

```bash
docker build -t whatsapp-chatbot:latest .
```

### Run Container

```bash
docker run -d \
  --name whatsapp-chatbot \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  whatsapp-chatbot:latest
```

### Docker Compose

```bash
docker-compose up -d
```

## Render.com

1. **Connect Repository**
   - Go to Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `whatsapp-chatbot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter

3. **Environment Variables**
   - Add all variables from `.env` file
   - Go to Environment tab
   - Add each variable individually

4. **Health Check**
   - Health Check Path: `/health`
   - Health Check Interval: 30s

5. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy automatically

6. **Webhook Configuration**
   - Copy your Render URL: `https://your-app.onrender.com`
   - Set Gupshup webhook URL: `https://your-app.onrender.com/webhook/gupshup`
   - Use your `WEBHOOK_VERIFY_TOKEN` in Gupshup dashboard

## AWS Deployment

### EC2 Instance

1. **Launch EC2 Instance**
   ```bash
   # SSH into instance
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

2. **Install Dependencies**
   ```bash
   # Install Node.js
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

   # Install PM2
   sudo npm install -g pm2
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone your-repo-url
   cd whatsapp-chatbot

   # Install dependencies
   npm install --production

   # Create .env file
   nano .env
   # Paste your environment variables

   # Start with PM2
   pm2 start src/index.js --name whatsapp-chatbot
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx** (for HTTPS)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **SSL Certificate** (Let's Encrypt)
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### ECS with Fargate

1. **Build and Push Docker Image**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name whatsapp-chatbot

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   docker build -t whatsapp-chatbot .
   docker tag whatsapp-chatbot:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-chatbot:latest
   docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-chatbot:latest
   ```

2. **Create Task Definition**
   - Go to ECS → Task Definitions → Create
   - Configure container with environment variables
   - Set port mapping: 3000

3. **Create Service**
   - Create ECS service from task definition
   - Configure load balancer
   - Set health check path: `/health`

## Google Cloud Platform

### Cloud Run

1. **Build and Deploy**
   ```bash
   # Set project
   gcloud config set project YOUR_PROJECT_ID

   # Build image
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/whatsapp-chatbot

   # Deploy
   gcloud run deploy whatsapp-chatbot \
     --image gcr.io/YOUR_PROJECT_ID/whatsapp-chatbot \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="GUPSHUP_API_KEY=xxx,GUPSHUP_APP_NAME=xxx,..."
   ```

2. **Configure Domain**
   - Map custom domain in Cloud Run
   - Set up SSL certificate

### App Engine

1. **Create app.yaml**
   ```yaml
   runtime: nodejs18

   env_variables:
     NODE_ENV: production
     PORT: 8080
     GUPSHUP_API_KEY: your_key
     GUPSHUP_APP_NAME: your_app
     # ... other variables
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   ```

## Post-Deployment Checklist

- [ ] Verify health endpoint: `https://your-domain.com/health`
- [ ] Verify readiness endpoint: `https://your-domain.com/ready`
- [ ] Test webhook verification: `GET /webhook/gupshup?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN`
- [ ] Configure Gupshup webhook URL
- [ ] Test sending a message via webhook
- [ ] Monitor logs for errors
- [ ] Set up monitoring alerts
- [ ] Configure auto-scaling (if needed)
- [ ] Set up backup strategy (if using database)

## Monitoring

### Health Checks

Monitor these endpoints:
- `/health` - Should return 200 OK
- `/ready` - Should return 200 OK when ready

### Logs

- Check application logs regularly
- Set up log aggregation (CloudWatch, Stackdriver, etc.)
- Monitor error rates

### Alerts

Set up alerts for:
- Health check failures
- High error rates
- Response time degradation
- API rate limit warnings

## Troubleshooting

### Application Won't Start

1. Check environment variables are set
2. Verify port is not in use
3. Check application logs
4. Verify Node.js version (16+)

### Webhook Not Working

1. Verify webhook URL is accessible (HTTPS required)
2. Check `WEBHOOK_VERIFY_TOKEN` matches
3. Verify Gupshup webhook configuration
4. Check server logs for incoming requests

### High Memory Usage

1. Check for memory leaks
2. Reduce log level in production
3. Consider increasing instance size
4. Review application code for optimization

## Scaling

### Horizontal Scaling

- Use load balancer
- Ensure stateless design (no session storage)
- Use shared cache/database if needed
- Configure auto-scaling based on CPU/memory

### Vertical Scaling

- Increase instance size
- Optimize application code
- Review dependencies

## Security

- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, GCP Secret Manager)
- Enable HTTPS only
- Regular dependency updates
- Monitor for security vulnerabilities

