const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// API endpoint to get Google Maps API key
app.get('/api/config', (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  });
});

// Get all leads from Google Sheet
app.get('/api/leads', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Leads!A:J',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return res.json([]);
    }

    const headers = rows[0];
    const leads = rows.slice(1).map((row, index) => {
      const lead = { id: index + 1 };
      headers.forEach((header, i) => {
        lead[header.toLowerCase().replace(/\s+/g, '_')] = row[i] || '';
      });
      return lead;
    });

    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Add a new lead
app.post('/api/leads', async (req, res) => {
  try {
    const { name, address, phone, website, email, notes, lat, lng, called, status } = req.body;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Leads!A:J',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          name || '',
          address || '',
          phone || '',
          website || '',
          email || '',
          notes || '',
          lat || '',
          lng || '',
          called ? 'Yes' : 'No',
          status || 'New'
        ]],
      },
    });

    res.json({ success: true, message: 'Lead added successfully' });
  } catch (error) {
    console.error('Error adding lead:', error);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

// Update lead status (called/not called)
app.put('/api/leads/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex) + 1; // +1 for header row
    const { called, status, notes } = req.body;

    // Update the called status (column I) and status (column J)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Leads!I${rowIndex + 1}:J${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[called ? 'Yes' : 'No', status || '']],
      },
    });

    // Update notes if provided
    if (notes !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Leads!F${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[notes]],
        },
      });
    }

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Initialize sheet with headers if empty
app.post('/api/init-sheet', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Leads!A1:J1',
    });

    if (!response.data.values || response.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Leads!A1:J1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Name', 'Address', 'Phone', 'Website', 'Email', 'Notes', 'Lat', 'Lng', 'Called', 'Status']],
        },
      });
    }

    res.json({ success: true, message: 'Sheet initialized' });
  } catch (error) {
    console.error('Error initializing sheet:', error);
    res.status(500).json({ error: 'Failed to initialize sheet' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
