# Supabase Auth Setup Instructions

För att kontohanteringen ska fungera exakt som önskat (inga verifieringsmail vid registrering, unika e-postadresser, och fungerande lösenordsåterställning) behöver du ändra några inställningar i din Supabase-dashboard.

## 1. Stäng av E-postverifiering (Email Confirmation)

Detta gör att konton skapas direkt och att systemet varnar om e-postadressen redan är upptagen.

1. Gå till ditt Supabase-projekt.
2. Klicka på **Authentication** i vänstermenyn.
3. Välj **Providers** -> **Email**.
4. Inaktivera **Confirm email** (Confirm email addresses).
5. Spara ändringarna.

## 2. Inställningar för URL omdirigeringar

För att lösenordsåterställning ska fungera korrekt (när användaren klickar på länken i mailet) måste omdirigerings-URL:en vara korrekt inställd.

1. Gå till **Authentication** -> **URL Configuration**.
2. Kontrollera **Site URL**. Den bör vara din produktions-URL (t.ex. `https://dartstreak.com` eller `http://localhost:8080` för lokal utveckling).
3. Under **Redirect URLs**, lägg till:
   - `http://localhost:8080/auth` (eller vilken port du kör lokalt)
   - `http://localhost:8080/`
   - Din produktions-URL om du har en.
   
   *Obs: I koden har vi satt redirect till `window.location.origin`/auth, så se till att bas-URL:en är tillåten.*

## 3. E-postmallar (Valfritt)

Du kan anpassa mailet som skickas vid återställning av lösenord.

1. Gå till **Authentication** -> **Email Templates**.
2. Välj **Reset Password**.
3. Här kan du ändra ämne och innehåll. Se till att länken `{{ .ConfirmationURL }}` finns med.

## Sammanfattning av kodändringar

Vi har uppdaterat koden för att:
-  Lagt till en "Glömt lösenord"-vy i inloggningsflödet.
-  Lagt till en vy för att välja nytt lösenord (när man klickat på återställningslänken).
-  Lagt till logik för att hantera dessa flöden i `useAuth` och `Auth.tsx`.
-  Lagt till svenska och engelska översättningar för de nya funktionerna.
