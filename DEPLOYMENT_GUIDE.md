# WhatsApp Bot Deployment Guide

Since Vercel does not support "Always On" background processes, you need to use a platform that supports Docker or long-running Node.js services.

## Recommended: Railway.app (Easiest)

1.  **Create a Railway account** and link your GitHub repo.
2.  **Add your Environment Variables** (.env content) in the Railway dashboard.
3.  **Deploy**. Railway will automatically detect the `Dockerfile` and build it.
4.  **Persistent Volume**: In Railway settings, add a "Volume" and mount it to `/.wwebjs_auth`. This ensures your session persists even after the server restarts.

## Alternative: Render.com

1.  **New Web Service**: Choose your GitHub repo.
2.  **Environment**: Select "Docker".
3.  **Variables**: Add your `.env` variables.
4.  **Note**: Free tier on Render will sleep after inactivity. You might need the "Starter" plan ($7/mo) for a reliable bot.

## DigitalOcean / VPS

1.  **Install Docker**: `sudo apt install docker.io`
2.  **Build your image**: `docker build -t whatsapp-bot .`
3.  **Run with persistence**:
    ```bash
    docker run -d --name my-bot -v $(pwd)/.wwebjs_auth:/usr/src/app/.wwebjs_auth --env-file .env whatsapp-bot
    ```

## Why Vercel won't work?
Vercel uses "Serverless Functions". A serverless function:
- Runs only when a URL is hit.
- Dies after 10-60 seconds.
- Cannot "listen" for new WhatsApp messages continuously.
