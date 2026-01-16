# Google Apps Script Backend - Sigurnosna Konfiguracija

## Upute za postavljanje

1. Otvori svoj Google Sheets
2. Idi na **Extensions** → **Apps Script**
3. Obriši postojeći kod
4. Kopiraj i zalijepi kod ispod
5. Spremi (Ctrl+S)
6. Klikni **Deploy** → **Manage deployments**
7. Klikni ikonu olovke (✏️) pored aktivnog deployment-a
8. U **Version** odaberi **New version**
9. Klikni **Deploy**

## Backend Kod (Code.gs)

```javascript
/**
 * Wedding RSVP Form Backend
 * Handles form submissions with security measures
 * 
 * Security features:
 * - Input validation
 * - Rate limiting
 * - Honeypot detection
 * - Timestamp verification
 * - Duplicate prevention
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 1. Validacija podataka
    if (!data.guests || !Array.isArray(data.guests) || data.guests.length === 0) {
      return createErrorResponse('Invalid data');
    }
    
    // 2. Provjera broja gostiju (max 10)
    if (data.guests.length > 10) {
      return createErrorResponse('Too many guests');
    }
    
    // 3. Provjera duljine imena (max 100 znakova po gostu)
    for (var i = 0; i < data.guests.length; i++) {
      if (data.guests[i].length > 100) {
        return createErrorResponse('Name too long');
      }
    }
    
    // 4. Provjera honeypot polja (anti-bot)
    if (data.website) {
      Logger.log('Bot detected - honeypot filled');
      return createErrorResponse('Bot detected');
    }
    
    // 5. Provjera timestamp-a (ne stariji od 5 minuta)
    var timestamp = new Date(data.timestamp);
    var now = new Date();
    var diff = (now - timestamp) / 1000 / 60; // razlika u minutama
    
    if (diff > 5 || diff < 0) {
      Logger.log('Invalid timestamp: ' + diff + ' minutes');
      return createErrorResponse('Invalid timestamp');
    }
    
    // 6. Rate limiting - provjera duplikata u zadnjih 5 minuta
    var lastRows = sheet.getRange(Math.max(1, sheet.getLastRow() - 20), 1, 20, 3).getValues();
    var guestsStr = data.guests.join(', ');
    
    for (var j = 0; j < lastRows.length; j++) {
      if (lastRows[j][1] === guestsStr) {
        var timeDiff = (now - new Date(lastRows[j][0])) / 1000 / 60;
        if (timeDiff < 5) {
          Logger.log('Duplicate submission detected');
          return createErrorResponse('Duplicate submission');
        }
      }
    }
    
    // Dodaj headere ako je prvi red
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Datum i vrijeme', 'Gosti', 'Napomena']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    
    // Spremi podatke
    sheet.appendRow([
      new Date(),
      guestsStr,
      data.notes || ''
    ]);
    
    Logger.log('Data saved successfully: ' + guestsStr);
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createErrorResponse('Server error');
  }
}

/**
 * Helper function to create error responses
 */
function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false, 
    error: message
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test endpoint - returns script status
 */
function doGet(e) {
  return ContentService.createTextOutput('Wedding RSVP Backend is running. Use POST method to submit data.');
}
```

## Dodatne Sigurnosne Mjere

### 1. Zaštita Google Sheets-a

1. Otvori svoj Google Sheets
2. Klikni **File** → **Share**
3. Promijeni pristup na **Restricted** (samo ti)
4. Klikni **Data** → **Protect sheets and ranges**
5. Odaberi **Sheet** → **Set permissions**
6. Odaberi **Only you**

### 2. Monitoring

- Provjeri logove u Apps Script: **Executions** (lijeva strana)
- Tamo možeš vidjeti sve pokušaje slanja i greške

### 3. Backup

- Redovito exportaj podatke: **File** → **Download** → **Microsoft Excel (.xlsx)**

## Deployment URL

Tvoj trenutni deployment URL:
```
https://script.google.com/macros/s/AKfycbxxpHO8vjFa-9op2_Hdbm46cfDR5Mm-tfeKghGJTmKm7WYJ2RZQXdwL7ASrEibmsXmA/exec
```

## Testiranje

Nakon deployment-a, testiraj formular na:
```
https://richbatorres.github.io/
```

## Troubleshooting

Ako formular ne radi:
1. Provjeri **Executions** u Apps Script za greške
2. Provjeri da je deployment postavljen na **Anyone** (Who has access)
3. Provjeri da si autorizirao pristup Google Sheets-u
4. Osvježi stranicu i pokušaj ponovno
