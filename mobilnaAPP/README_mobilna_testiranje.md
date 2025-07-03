## Kako omogućiti drugima da testiraju Android aplikaciju (APK)

### 1. Generisanje APK fajla

Prvo, izgeneriši APK fajl na svom računaru:

./gradlew assembleDebug

Nakon toga, APK će biti u:

app/build/outputs/apk/debug/app-debug.apk


---

### 2. Deljenje APK fajla

Da bi tvoj prijatelj mogao da testira aplikaciju, pošalji mu APK na jedan od sledećih načina:

- **Google Drive**: Okači `app-debug.apk` na svoj Drive, klikni desni klik → "Get link" → izaberi "Anyone with the link" i pošalji mu link.
- **WeTransfer, Dropbox, Mega**: Okači fajl i podeli link.
- **Direktno**: Pošalji APK putem emaila, Telegrama, WhatsAppa ili slično.

---

### 3. Instalacija APK na telefonu

1. Prijatelj treba da preuzme APK fajl na svoj Android telefon.
2. Prilikom prvog pokušaja instalacije izvan Play Store-a, Android će tražiti dozvolu za instalaciju iz "Nepoznatih izvora" (Settings > Security > Install unknown apps). Potrebno je dozvoliti ovu opciju.
3. Nakon toga, klikom na APK fajl pokreće se instalacija aplikacije.

---

### 4. Napomene

- Ovaj način je **isključivo za testiranje i razvoj** – za širu distribuciju koristi Google Play (Closed testing, Beta, itd.).
- Prijatelj može uvek deinstalirati aplikaciju kao i svaku drugu.

---

**Za iOS korisnike:**  
Ovakav način nije moguć za iOS – za testiranje na iPhone
