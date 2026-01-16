# Google Apps Script Backend - Sigurnosna Konfiguracija

## Upute za postavljanje

1. Otvori svoj Google Sheets
2. Idi na **Extensions** → **Apps Script**
3. Obriši postojeći kod
4. Kopiraj i zalijepi kod ispod
5. **VAŽNO:** Promijeni email adresu u kodu (linija 8)
6. Spremi (Ctrl+S)
7. Klikni **Deploy** → **Manage deployments**
8. Klikni ikonu olovke (✏️) pored aktivnog deployment-a
9. U **Version** odaberi **New version**
10. Klikni **Deploy**

## Backend Kod (Code.gs)

```javascript
/**
 * Wedding RSVP Form Backend with Email Notifications
 * Handles form submissions with security measures and email alerts
 */

// KONFIGURIRAJ SVOJU EMAIL ADRESU OVDJE:
const NOTIFICATION_EMAIL = 'tvoj.email@example.com'; // PROMIJENI OVO!

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 1. Validacija podataka
    if (!data.guests || !Array.isArray(data.guests) || data.guests.length === 0) {
      sendSecurityAlert('Invalid data structure', data);
      return createErrorResponse('Invalid data');
    }
    
    // 2. Provjera broja gostiju (max 10)
    if (data.guests.length > 10) {
      sendSecurityAlert('Too many guests attempt', data);
      return createErrorResponse('Too many guests');
    }
    
    // 3. Provjera duljine imena (max 100 znakova po gostu)
    for (var i = 0; i < data.guests.length; i++) {
      if (data.guests[i].length > 100) {
        sendSecurityAlert('Name too long attempt', data);
        return createErrorResponse('Name too long');
      }
    }
    
    // 4. Provjera honeypot polja (anti-bot)
    if (data.website) {
      sendSecurityAlert('Bot detected - honeypot filled', data);
      Logger.log('Bot detected - honeypot filled');
      return createErrorResponse('Bot detected');
    }
    
    // 5. Provjera timestamp-a (ne stariji od 5 minuta)
    var timestamp = new Date(data.timestamp);
    var now = new Date();
    var diff = (now - timestamp) / 1000 / 60; // razlika u minutama
    
    if (diff > 5 || diff < 0) {
      sendSecurityAlert('Invalid timestamp: ' + diff + ' minutes', data);
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
          sendSecurityAlert('Duplicate submission detected', data);
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
    
    // Pošalji email notifikaciju za uspješan unos
    sendSuccessNotification(guestsStr, data.notes);
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    sendErrorNotification(error.toString());
    return createErrorResponse('Server error');
  }
}

/**
 * Šalje email notifikaciju za uspješan RSVP
 */
function sendSuccessNotification(guests, notes) {
  try {
    var subject = '✅ Nova potvrda dolaska - Vjenčanje';
    var body = 'Nova potvrda dolaska je zaprimljena!\n\n' +
               '👥 Gosti: ' + guests + '\n' +
               '📝 Napomena: ' + (notes || 'Nema napomene') + '\n' +
               '🕐 Vrijeme: ' + new Date().toLocaleString('hr-HR') + '\n\n' +
               '---\n' +
               'Provjeri Google Sheets za sve detalje.';
    
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });
  } catch (error) {
    Logger.log('Email notification failed: ' + error.toString());
  }
}

/**
 * Šalje sigurnosno upozorenje za sumnjive aktivnosti
 */
function sendSecurityAlert(reason, data) {
  try {
    var subject = '⚠️ Sigurnosno upozorenje - RSVP Form';
    var body = 'Detektirana sumnjiva aktivnost!\n\n' +
               '🚨 Razlog: ' + reason + '\n' +
               '📊 Podaci: ' + JSON.stringify(data) + '\n' +
               '🕐 Vrijeme: ' + new Date().toLocaleString('hr-HR') + '\n\n' +
               '---\n' +
               'Zahtjev je automatski odbijen.';
    
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });
  } catch (error) {
    Logger.log('Security alert email failed: ' + error.toString());
  }
}

/**
 * Šalje notifikaciju o grešci
 */
function sendErrorNotification(errorMessage) {
  try {
    var subject = '❌ Greška - RSVP Form';
    var body = 'Došlo je do greške u obradi RSVP zahtjeva!\n\n' +
               '❌ Greška: ' + errorMessage + '\n' +
               '🕐 Vrijeme: ' + new Date().toLocaleString('hr-HR');
    
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: body
    });
  } catch (error) {
    Logger.log('Error notification email failed: ' + error.toString());
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

## Email Notifikacije

### Primjer email-a za uspješan RSVP:
```
Subject: ✅ Nova potvrda dolaska - Vjenčanje

Nova potvrda dolaska je zaprimljena!

👥 Gosti: Marko Marković, Ana Anić
📝 Napomena: Vegetarijanska prehrana
🕐 Vrijeme: 10.1.2025. 14:30:25

---
Provi Google Sheets za sve detalje.
```

### Primjer sigurnosnog upozorenja:
```
Subject: ⚠️ Sigurnosno upozorenje - RSVP Form

Detektirana sumnjiva aktivnost!

🚨 Razlog: Bot detected - honeypot filled
📊 Podaci: {"guests":["Bot"],"website":"spam"}
🕐 Vrijeme: 10.1.2025. 14:30:25

---
Zahtjev je automatski odbijen.
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
- Primit ćeš email za svaki RSVP i svaku sumnjiv aktivnost
- Tamo možeš vidjeti sve pokušaje slanja i greške

### 3. Backup

- Redovito exportaj podatke: **File** → **Download** → **Microsoft Excel (.xlsx)**

## Deployment URL

Tvoj trenutni deployment URL:
```
https://script.google.com/macros/s/AKfycbxxpHO8vjFa-9op2_Hdbm46cfDR5Mm-tfeKghGJTmKm7WYJ2RZQXdwL7ASrEibmsXmA/exec
```

## Testiranje

Nakon deployment-a:
1. Testiraj formular na: `https://richbatorres.github.io/`
2. Provjeri da li primaš email notifikacije
3. Pokreni security test: `https://richbatorres.github.io/test-security.html`
4. Provjeri da li primaš sigurnosna upozorenja za odbijene zahtjeve

## Troubleshooting

Ako ne primaš email-ove:
1. Provjeri da si promijenio `NOTIFICATION_EMAIL` u kodu
2. Provjeri spam folder
3. Provjeri **Executions** u Apps Script za greške
4. Provjeri da je deployment postavljen na **Anyone** (Who has access)
5. Provjeri da si autorizirao pristup Gmail-u (prvi put će tražiti dozvolu)

## Sigurnosne Značajke

✅ **Što je implementirano:**
- Input validacija (duljina, format, broj gostiju)
- Rate limiting (sprječava spam)
- Honeypot detekcija (hvata botove)
- Timestamp validacija (sprječava replay napade)
- Duplikat provjera (sprječava dvostruke unose)
- Email notifikacije za sve uspješne RSVP-ove
- Sigurnosna upozorenja za sumnjive aktivnosti
- Error notifikacije za greške u sistemu

✅ **Što je zaštićeno:**
- Google Sheets URL nije dostupan nigdje u kodu
- Samo ti možeš vidjeti i mijenjati podatke u Sheets-u
- Svi zahtjevi prolaze kroz validaciju
- Primaš notifikaciju za svaku aktivnost
