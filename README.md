# Personal Sales Tracker

A powerful CRM application with Google Maps integration for tracking sales leads. Search for businesses, filter by missing contact info, mark calls, and sync everything to Google Sheets.

![Personal Sales Tracker](https://via.placeholder.com/800x400?text=Personal+Sales+Tracker)

## Features

- 🗺️ **Google Maps Integration** - Search and view businesses directly on an interactive map
- 🔍 **Business Search** - Find businesses using Google Places API
- 📊 **Lead Management** - Track all your sales leads in one place
- ✅ **Call Tracking** - Mark leads as called with checkboxes
- 🔄 **Google Sheets Sync** - All data automatically syncs to your Google Sheet
- 🎯 **Smart Filters** - Filter leads by:
  - No website
  - No phone number
  - Not called yet
- 📱 **Responsive Design** - Works on desktop and mobile
- 🌙 **Dark Theme** - Easy on the eyes

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Google Cloud Console account
- Google Sheet created for data storage

### 2. Google Cloud Setup

#### Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Sheets API

#### Get Maps API Key
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Restrict the key to Maps JavaScript API and Places API
4. Copy the API key

#### Create Service Account for Sheets
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Name it (e.g., "sales-tracker-sheets")
4. Grant **Editor** role
5. Click on the service account > **Keys** > **Add Key** > **Create new key** > **JSON**
6. Download the JSON file

### 3. Google Sheet Setup

1. Create a new Google Sheet
2. Rename the first sheet tab to **"Leads"**
3. Share the sheet with your service account email (from the JSON file)
4. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```

### 4. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials:
   ```
   GOOGLE_MAPS_API_KEY=your_maps_api_key
   GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your_sheet_id
   PORT=3001
   ```

### 5. Install & Run

```bash
# Install all dependencies
npm run install-all

# Start the development server
npm run dev

# In a new terminal, start the React client
npm run client
```

The app will be available at `http://localhost:3000`

## Usage

### Searching for Businesses
1. Click the **Search** tab in the sidebar
2. Enter a search query (e.g., "restaurants near downtown")
3. Results appear on the map with orange markers
4. Click **+ Add to Leads** to save a business

### Managing Leads
1. Click the **Leads** tab in the sidebar
2. Check the box next to a lead to mark it as called
3. Use the dropdown to change lead status
4. Click **📍 Show on Map** to locate the business

### Filtering Leads
Use the toggle switches to filter:
- **No Website** - Show only leads without websites
- **No Phone** - Show only leads without phone numbers
- **Not Called Yet** - Show only leads you haven't called

## Map Markers

- 🟣 **Purple circles** - Leads not yet called
- 🟢 **Green circles** - Leads marked as called
- 🟠 **Orange arrows** - Search results

## Google Sheet Structure

Your sheet will have these columns:
| Name | Address | Phone | Website | Email | Notes | Lat | Lng | Called | Status |

## Tech Stack

- **Frontend**: React, Google Maps React
- **Backend**: Node.js, Express
- **APIs**: Google Maps, Google Places, Google Sheets
- **Styling**: Custom CSS with dark theme

## Troubleshooting

### "Loading Sales Tracker..." stuck
- Check your `.env` file has the correct API key
- Ensure the Maps JavaScript API is enabled

### Leads not syncing
- Verify the Sheet ID is correct
- Check the service account has Editor access to the sheet
- Ensure the sheet has a tab named "Leads"

### Places search not working
- Enable the Places API in Google Cloud Console
- Add Places API to your API key restrictions

## License

MIT License - feel free to use and modify for your needs!
