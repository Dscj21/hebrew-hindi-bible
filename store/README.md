# Play Store kit: Hebrew Greek Hindi Bible

| Item | Value / file |
|---|---|
| Package (applicationId) | `in.hebrewhindi.bible` (permanent, never change) |
| Version | 5.1 (versionCode 6) |
| Upload file | `../dist/hebrew-greek-hindi-bible-release.aab` (signed with the release/upload key in `.deploy/release.jks`; enrol in Play App Signing on first upload) |
| App name | Hebrew Greek Hindi Bible (24 chars) |
| Listings | `listing-en.md`, `listing-hi.md` (title / short / full) |
| App icon 512×512 | `icon-512.png` |
| Feature graphic 1024×500 | `feature-graphic-1024x500.png` (source `feature-graphic.html`) |
| Phone screenshots 1080×1920 | `screenshots/01-home.png` … `08-notes-highlights.png` (8) |
| Privacy policy URL | https://dscj21.github.io/hebrew-hindi-bible/privacy.html |
| Contact email | bluesparrowrecords7@gmail.com |
| Website | https://dscj21.github.io/hebrew-hindi-bible/ |
| Category | **Books & Reference** (alternative: Education) |
| Tags | Bible, Religion, Language learning, Reference |
| Ads | Yes, contains ads (AdMob banner) |
| In-app purchases | No |
| App access | All functionality available without login |

## Target audience & content
- Target age groups: **18+** (and optionally 13-17). Do **not** pick under-13 groups (keeps AdMob outside Families policy). Not designed for children.
- Content rating (IARC questionnaire), category "Reference, News, or Educational":
  - Violence, sexual content, profanity, drugs, gambling: **No**. (Bible text is scripture; no graphic imagery.)
  - User-generated content shared with others / user interaction / chat: **No** (notes stay on device).
  - Shares user location: **No**. Digital purchases: **No**.
  - Expected result: Everyone / 3+ (PEGI 3, ESRB Everyone).
- News app: No. COVID-19 app: No. Government app: No. Financial features: None. Health: No.

## Data safety form (checklist)
**Does your app collect or share any of the required user data types?** → **Yes** (because of the AdMob SDK).
**Is all user data encrypted in transit?** → Yes (AdMob uses HTTPS).
**Do you provide a way for users to request deletion?** → Users can delete on-device data by clearing app data / uninstalling. No account exists. (Answer: "No, but data is not linked to an account": choose per form wording.)

Data types (collected by the Google Mobile Ads SDK; not by the app itself):
- [x] **Device or other IDs**: Advertising ID. Collected: Yes. Shared: Yes (with Google for ads). Purpose: Advertising or marketing; Analytics; Fraud prevention, security, and compliance. Processed ephemerally: No. Required (users can't turn off): Yes (users can reset/delete Ad ID in Android settings).
- [x] **App activity → App interactions** (ad views/clicks). Collected and shared with Google. Purpose: Advertising, Analytics, Fraud prevention.
- [x] **App info and performance → Crash logs / Diagnostics** (SDK diagnostics). Collected. Purpose: Analytics, Fraud prevention.
- [x] **Location → Approximate location** (derived from IP by the ads SDK). Collected and shared with Google. Purpose: Advertising, Fraud prevention.
- [ ] Personal info (name, email, address, phone): **No**
- [ ] Financial info, Health, Messages, Photos/videos, Audio, Files, Calendar, Contacts, Web history: **No**
- Notes, highlights, streaks, settings: stored **only on device**, never transmitted → **not collected** (on-device-only data is not "collected" per Play's definition).
- Local notifications: no data leaves the device.

Reference: Google's guidance for apps using the Mobile Ads SDK: https://developers.google.com/admob/android/privacy/play-data-disclosure

## Before first upload
1. AdMob: link the app in AdMob after it's published; add `app-ads.txt` at the **root of your developer website domain** (see note below).
2. Play Console → App content: privacy policy URL, ads = yes, target audience, content rating, data safety (above), app access (no login).
3. Upload the AAB to Internal testing first; test on a real phone (ads should show as "Test Ad" only on registered test devices; add your phone's test-device ID to `ads.json → android.testingDevices`).

### app-ads.txt note
The file is live at https://dscj21.github.io/hebrew-hindi-bible/app-ads.txt, but AdMob looks for it at the **root of the developer website domain** you enter in Play Console (e.g. `https://example.com/app-ads.txt`). A GitHub Pages *project* path won't verify. It verifies only once you use a custom domain (or a `dscj21.github.io` user-site repo serving `/app-ads.txt` at the root).
