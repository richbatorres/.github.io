# Google OAuth Setup — Vodič za velike datoteke

Ovaj vodič objašnjava kako postaviti Google OAuth za resumable upload velikih datoteka (>35 MB).

---

## Je li ovo besplatno?

**DA, potpuno besplatno.** Evo detalja:

| Usluga | Cijena | Napomena |
|--------|--------|----------|
| Google Cloud Console | Besplatno | Samo za konfiguraciju |
| OAuth Client ID | Besplatno | Nema limita na broj prijava |
| Google Drive API | Besplatno | Do 1 milijarde API poziva/dan (nećeš ni blizu) |
| Google Identity Services (login popup) | Besplatno | Google-ov standardni sign-in |
| Google Drive storage | 15 GB besplatno | Dijeli se s Gmail i Photos |

**Nema skrivenih troškova.** Google ne naplaćuje OAuth autentifikaciju. To je isti mehanizam koji koriste sve "Sign in with Google" stranice na internetu.

Jedini trošak bi bio ako ti ponestane prostora na Driveu (15 GB besplatno). Za više prostora: Google One 100 GB = ~2€/mjesec.

---

## Korak-po-korak postavljanje

### 1. Kreiraj Google Cloud projekt

1. Otvori: https://console.cloud.google.com
2. Prijavi se s **istim Google računom** koji koristiš za Apps Script
3. Gore lijevo klikni na padajući izbornik projekata (piše "Select a project" ili ime postojećeg projekta)
4. Klikni **"New Project"**
5. Ime projekta: `Wedding Gallery` (ili što god želiš)
6. Klikni **"Create"**
7. Pričekaj par sekundi da se projekt kreira
8. Provjeri da je novi projekt odabran u padajućem izborniku gore lijevo

### 2. Omogući Google Drive API

1. U lijevom izborniku klikni **"APIs & Services"** → **"Library"**
2. U tražilicu upiši: `Google Drive API`
3. Klikni na **"Google Drive API"** rezultat
4. Klikni veliki plavi gumb **"Enable"**
5. Pričekaj par sekundi

### 3. Konfiguriraj OAuth Consent Screen

Ovo je ekran koji gosti vide kad ih Google pita za dozvolu.

1. U lijevom izborniku: **"APIs & Services"** → **"OAuth consent screen"**
2. Odaberi **"External"** (jer gosti koriste svoje Google račune)
3. Klikni **"Create"**
4. Ispuni formu:
   - **App name:** `Wedding Gallery Upload`
   - **User support email:** tvoj email
   - **Developer contact email:** tvoj email
5. Klikni **"Save and Continue"**
6. Na "Scopes" stranici klikni **"Add or Remove Scopes"**
7. Traži: `drive.file` i označi **`../auth/drive.file`** (ovo dopušta upload samo u datoteke koje app kreira — ne daje pristup cijelom Driveu gosta)
8. Klikni **"Update"** pa **"Save and Continue"**
9. Na "Test users" stranici — **preskoči** (klikni "Save and Continue")
10. Klikni **"Back to Dashboard"**

**VAŽNO:** App će biti u "Testing" statusu. To znači da samo 100 korisnika može koristiti OAuth dok ne verificiraš app. Za vjenčanje s manje od 100 gostiju to je sasvim dovoljno. Ako imaš više, moraš submitati app za verifikaciju (traje par dana).

### 4. Kreiraj OAuth Client ID

1. U lijevom izborniku: **"APIs & Services"** → **"Credentials"**
2. Klikni **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Wedding Gallery Web`
5. Pod **"Authorized JavaScript origins"** dodaj:
   - `https://script.google.com`
   - (Ako testiraš lokalno, dodaj i: `http://localhost`)
6. Pod **"Authorized redirect URIs"** — ostavi prazno (nije potrebno za token client)
7. Klikni **"Create"**
8. Pojavi se popup s tvojim **Client ID** — izgleda ovako:
   ```
   123456789-abcdefgh.apps.googleusercontent.com
   ```
9. **Kopiraj taj Client ID!**

### 5. Unesi Client ID u kod

Otvori `Index.html` i nađi ovaj red:

```javascript
GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
```

Zamijeni ga s tvojim pravim Client ID-om:

```javascript
GOOGLE_CLIENT_ID: '123456789-abcdefgh.apps.googleusercontent.com',
```

### 6. Unesi Folder ID

U istom CONFIG bloku nađi:

```javascript
UPLOAD_FOLDER_ID: 'YOUR_FOLDER_ID_HERE'
```

Zamijeni s istim folder ID-om koji imaš u `Code.gs`. To je ID foldera na tvom Driveu gdje idu uploadane datoteke.

**Kako naći folder ID:**
1. Otvori Google Drive
2. Otvori tvoj upload folder
3. Pogledaj URL: `https://drive.google.com/drive/folders/XXXXXXXXXXXXXXX`
4. `XXXXXXXXXXXXXXX` je tvoj folder ID

### 7. Podijeli folder s "Anyone with link"

Da bi gosti mogli uploadati u tvoj folder preko Drive API-ja, folder mora imati dijeljenje:

1. Desni klik na folder u Google Driveu → **"Share"**
2. Pod "General access" promijeni na **"Anyone with the link"**
3. Uloga: **"Editor"** (moraju moći pisati)
4. Klikni **"Done"**

**Alternativa (sigurnija):** Umjesto dijeljenja foldera, možeš koristiti Service Account. Ali za vjenčanje je dijeljeni folder najjednostavniji pristup.

### 8. Testiraj

1. Deplojiraj ažurirani Apps Script (Deploy → New deployment)
2. Otvori web app URL
3. Odaberi video veći od 35 MB
4. Trebao bi se pojaviti modal "Potrebna prijava"
5. Klikni "Prijavi se s Google"
6. Prijavi se s bilo kojim Google računom
7. Video bi se trebao uploadati s prikazom postotka

---

## Što gost vidi

1. Odabere veliku datoteku
2. Pojavi se poruka: "Odabrane datoteke su veće od 35 MB. Za siguran prijenos potrebna je kratka prijava s Google računom."
3. Klikne "Prijavi se s Google"
4. Otvori se standardni Google sign-in popup (isti kao na bilo kojoj stranici)
5. Odabere svoj Google račun
6. Klikne "Allow" (dopusti pristup)
7. Upload počinje automatski s prikazom postotka
8. Gotovo!

Prijava traje samo za tu sesiju. Kad zatvore browser, moraju se ponovo prijaviti za sljedeći veliki file.

---

## Česta pitanja

**Q: Može li gost vidjeti moj Drive?**
A: NE. Scope `drive.file` dopušta SAMO upload u datoteke koje je app kreirao. Gost ne može vidjeti, brisati, niti pregledavati ništa na tvom Driveu.

**Q: Što ako gost nema Google račun?**
A: Može uploadati datoteke do 35 MB bez prijave. Za veće datoteke treba Google račun (Gmail, YouTube, Android — gotovo svi ga imaju).

**Q: Hoće li Google prikazati "This app isn't verified" upozorenje?**
A: Da, dok je app u "Testing" modu. Gost mora kliknuti "Advanced" → "Go to Wedding Gallery Upload (unsafe)". Zvuči scary ali je potpuno sigurno — to je samo zato što Google nije pregledao tvoj app. Za vjenčanje je to OK.

**Q: Mogu li izbjeći "unverified app" upozorenje?**
A: Da, ali moraš submitati app za Google verifikaciju (traje 3-7 dana). Za manje od 100 gostiju nije potrebno.

**Q: Koliko košta sve ovo?**
A: 0 kuna. Potpuno besplatno.

---

## Troubleshooting

| Problem | Rješenje |
|---------|----------|
| "Error 400: redirect_uri_mismatch" | Dodaj `https://script.google.com` u Authorized JavaScript origins |
| "Access blocked: app not verified" | Normalno za testing mode. Klikni Advanced → Go to app |
| Upload fails s 403 | Provjeri da je folder dijeljen kao "Editor" za "Anyone with link" |
| "Pop-up blocked" | Gost mora dopustiti popupe za tu stranicu |
| Token expired | Gost se mora ponovo prijaviti (token traje ~1 sat) |

---

*Cijeli proces postavljanja traje 10-15 minuta. Jednom kad je postavljeno, radi bez održavanja.*
