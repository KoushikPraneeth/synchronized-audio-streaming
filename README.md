# AudioSync - Synchronized Audio Streaming

Stream audio from your laptop to multiple devices in perfect synchronization. Turn any collection of devices into a synchronized audio system.

## Features

- **Synchronized Playback**: All connected devices play audio in perfect sync
- **Easy Setup**: No app installation required, works directly in your browser
- **Multi-Device Support**: Connect as many devices as you want

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Real-time Communication**: Socket.IO
- **Audio Processing**: Web Audio API

## Deployment on Vercel

This project is configured for deployment on Vercel. Follow these steps to deploy:

1. **Connect to GitHub**: Connect your GitHub repository to Vercel
2. **Configure Project**: 
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Environment Variables**: 
   - No additional environment variables are required for basic functionality

4. **Deploy**: Click "Deploy" and Vercel will build and deploy your application

## Development

To run this project locally:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. **Host**: Creates a session and shares system audio
2. **Clients**: Join the session by scanning a QR code or entering a room code
3. **Synchronization**: Time synchronization protocol keeps all devices in sync
4. **Audio Streaming**: Audio is captured and streamed in real-time to all connected devices

## Limitations in Serverless Environment

Since Vercel uses a serverless architecture, there are some limitations:

1. **Connection Persistence**: Serverless functions have a limited execution time
2. **State Management**: In-memory data won't persist between function invocations
3. **Cold Starts**: There might be delays when establishing new connections after periods of inactivity

For a production environment with high traffic, consider:
- Using a database like MongoDB or PostgreSQL to store room information
- Using Redis for real-time data and pub/sub functionality
- Implementing more robust retry logic on the client side

## License

MIT
