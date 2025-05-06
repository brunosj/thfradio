# SoundCloud Integration Setup

To enable SoundCloud integration for THF Radio, you need to configure the following environment variables:

## Required Environment Variables

Add these to your `.env.local` file:

```
# SoundCloud API - Required for SoundCloud integration
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
SOUNDCLOUD_USER_ID=your_user_id
```

## How to Get SoundCloud Credentials

1. **Create a SoundCloud App**:

   - Go to [SoundCloud for Developers](https://developers.soundcloud.com/)
   - Create a new app to get your Client ID and Client Secret

2. **Find Your User ID**:
   - The User ID is the numeric ID of your SoundCloud account
   - You can find it by visiting your profile and inspecting the page source
   - Alternatively, use a tool like the SoundCloud API Explorer

## Common Issues

- If shows aren't appearing, check the browser console for error messages
- Ensure SoundCloud shows have proper titles - they should include a date after "//" (e.g., "Show Name // 01.01.23")
- The app will automatically format titles to include dates if needed

## Troubleshooting

If you still have issues:

1. Check the server logs for SoundCloud API errors
2. Verify that your credentials are correct and your API quota isn't exhausted
3. Make sure your SoundCloud account has public tracks available
