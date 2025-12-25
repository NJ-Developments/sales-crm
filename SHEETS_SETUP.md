# Google Sheets Sync Setup (For You + 3 Friends)

## Step 1: Create a Google Sheet
1. Go to https://sheets.google.com
2. Create a new spreadsheet
3. Name the first sheet "Leads"
4. Add these headers in row 1:
   `ID | Name | Address | Phone | Website | Called | AddedBy | AddedAt`

## Step 2: Create Apps Script
1. In your Google Sheet, go to Extensions → Apps Script
2. Delete everything and paste this code:

```javascript
const SHEET_NAME = 'Leads';

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);
  
  if (data.action === 'add') {
    const lead = data.lead;
    sheet.appendRow([
      lead.id,
      lead.name,
      lead.address,
      lead.phone,
      lead.website,
      lead.called ? 'Yes' : 'No',
      lead.addedBy || 'Unknown',
      new Date().toISOString()
    ]);
  }
  
  if (data.action === 'update') {
    const lead = data.lead;
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === lead.id) {
        sheet.getRange(i + 1, 6).setValue(lead.called ? 'Yes' : 'No');
        break;
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const leads = [];
  
  for (let i = 1; i < data.length; i++) {
    leads.push({
      id: data[i][0],
      name: data[i][1],
      address: data[i][2],
      phone: data[i][3],
      website: data[i][4],
      called: data[i][5] === 'Yes',
      addedBy: data[i][6],
      addedAt: data[i][7]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(leads))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Step 3: Deploy as Web App
1. Click Deploy → New deployment
2. Select type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Click Deploy
6. Copy the Web App URL

## Step 4: Use in Lead Tracker
1. Open the Lead Tracker app
2. Paste the Web App URL in the "Google Sheet URL" field
3. Share the Google Sheet with your 3 friends (Editor access)
4. Share the Web App URL with them too

Now everyone can:
- Search for businesses
- Add leads (synced to sheet)
- Mark calls (updates sheet)
- See all leads from the team
