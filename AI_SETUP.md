# AI Subtask Generation Setup Guide

## Overview
The GRADUALLY task manager now includes AI-powered subtask generation using OpenRouter API. The API key is pre-configured and managed by the application, so users don't need to worry about setting it up.

## For Developers/Administrators

### Setting up the API Key

1. **Get an OpenRouter API Key:**
   - Go to [https://openrouter.ai](https://openrouter.ai)
   - Sign up or log in to your account
   - Navigate to the API Keys section
   - Create a new API key

2. **Configure the Environment Variable:**
   - Copy `.env.example` to `.env`
   - Replace `your-openrouter-api-key-here` with your actual API key:
   ```bash
   VITE_OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
   ```

3. **For Production Deployment:**
   - Set the `VITE_OPENROUTER_API_KEY` environment variable in your hosting platform
   - Examples:
     - **Vercel**: Add in Project Settings > Environment Variables
     - **Netlify**: Add in Site Settings > Environment Variables  
     - **Heroku**: Use `heroku config:set VITE_OPENROUTER_API_KEY=your-key`

### Security Considerations

⚠️ **Important**: The current implementation exposes the API key in the frontend bundle. For production use, consider:

1. **Backend Proxy** (Recommended):
   - Move API calls to your backend server
   - Store the API key securely on the server
   - Frontend calls your backend, which then calls OpenRouter

2. **Rate Limiting**:
   - Implement usage limits per user/session
   - Monitor API usage to prevent abuse

3. **Key Rotation**:
   - Regularly rotate your API keys
   - Monitor usage in OpenRouter dashboard

### Current Model Configuration
- **Model**: `openai/gpt-oss-20b:free`
- **Temperature**: 0.7
- **Max Tokens**: 1000

## User Experience

Users can now:
- Click "🤖 AI Generate" button when creating/editing tasks
- AI automatically generates relevant subtasks based on task title and deadline
- All generated subtasks are editable and clickable
- No need to configure API keys - it works out of the box

## Troubleshooting

### "AI service is currently unavailable"
- Check if the API key is properly set in environment variables
- Verify the API key is valid and has sufficient credits
- Check OpenRouter service status

### Subtasks not generating
- Ensure task title and deadline are filled before clicking AI Generate
- Check browser console for detailed error messages
- Verify internet connection

## Features

- ✅ Smart subtask generation based on task context
- ✅ Automatic date validation (no past dates)
- ✅ Editable AI-generated subtasks
- ✅ Error handling and user feedback
- ✅ No user configuration required