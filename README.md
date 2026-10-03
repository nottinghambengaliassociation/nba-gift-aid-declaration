# Nottingham Bengali Association – Gift Aid declaration app

A small Google Apps Script web app that collects Gift Aid declarations for Nottingham Bengali Association (Registered Charity No. 1211066).

When a donor submits the form, the app:

1. checks their details and saves a row to the **nba-gift-aid-declaration-2026** Google Sheet,
2. makes a PDF copy of the declaration and saves it in a Drive folder,
3. emails the donor a confirmation with the PDF attached, sent from the charity's account,
4. emails connect@ a short notice with links to the row and the PDF.

The postcode lookup uses Ideal Postcodes. The API key is kept in the script's hidden settings and never reaches the donor's browser.

---

## What's in this folder

| File | What it does |
|---|---|
| `appsscript.json` | Project settings: London time zone, web app access, permissions |
| `Config.gs` | **Charity settings and declaration wording – the file you're most likely to edit** |
| `Code.gs` | Serves the form and receives submissions |
| `Postcode.gs` | Address lookup through Ideal Postcodes |
| `Records.gs` | Writes declarations to the spreadsheet |
| `Documents.gs` | Builds the PDF copy and the two emails |
| `Setup.gs` | One-time setup, plus checks and tests you run from the editor |
| `Index.html` | The form page |
| `Styles.html` | The form's look (light and dark mode) |
| `Client.html` | The form's behaviour in the browser |
| `Logo.html` | The NBA logo, embedded so the app needs no outside image links |
| `Makefile` | Optional shortcuts that automate the copying and deploying (see below) |
| `.claspignore` | Tells the `clasp` tool which files not to upload |

---

## Before you start

You'll need:

- The charity's Google Workspace account **connect@nottinghambengaliassociation.co.uk**. Deploy the app from this account so the emails come from connect@ and replies land there.
- The **Ideal Postcodes API key** the charity bought.
- About 30–45 minutes.

> **Tip:** use a **private or incognito window signed in only as connect@** for every step below. The Apps Script editor often fails ("Failed to create a script for user…") when more than one Google account is signed in to the same browser.

---

## Quick route: let `make` do the copying and deploying

If you're comfortable using a terminal, the `Makefile` automates Steps 1, 2 and 7 and walks you through the rest. You'll need **Node.js 18 or newer** (from <https://nodejs.org>) and `make` (built in on macOS and Linux; on Windows use WSL or Git Bash).

Open a terminal in this folder and run:

```
make first-time
```

It goes through these in order, pausing where you need to do something in the browser:

| Command | What it does |
|---|---|
| `make tools` | Checks Node.js is installed |
| `make enable-api` | Opens the page where you switch on the Apps Script API for connect@ (one-time) |
| `make login` | Signs the `clasp` tool in to Google – choose connect@ |
| `make create` | Creates the Apps Script project |
| `make push` | Checks the code for errors and uploads every file |
| `make settings` | Opens Project Settings so you can add the Ideal Postcodes key (Step 3) |
| `make setup-steps` | Opens the editor so you can run `setup` and the tests (Steps 5–6) |

**Already created a project in the browser?** Skip `make create` and link to it instead, using the script ID from the editor's **Project Settings → IDs**:

```
make link ID=your-script-id
make push
```

Google only allows the app's permissions to be approved in the editor, and the API key is deliberately kept out of the code, so those two steps stay manual.

Then publish it:

```
make deploy      # creates the web app and prints its link
make url         # shows the link again at any time
```

**For every update afterwards**, edit the files and run:

```
make release     # checks, uploads, and publishes a new version – the link stays the same
```

Run `make` on its own to see every command. The project ID is saved in `.clasp.json` and the web app's ID in `.deployment-id`. Keep both files: without `.deployment-id`, the next `make deploy` would create a second web app with a different link.

If you'd rather not use a terminal, follow the manual steps below instead.

---

## Step 1 – Create the Apps Script project

1. In an incognito window, sign in as connect@ and go to <https://script.google.com>.
2. Click **New project**.
3. Click **Untitled project** at the top and rename it **NBA Gift Aid declaration**.

## Step 2 – Add the files

The editor starts with one file called `Code.gs`. You'll add the rest.

**Show the manifest first:**

1. Click the **⚙ Project Settings** icon on the left.
2. Tick **Show "appsscript.json" manifest file in editor**.
3. Go back to the **‹ › Editor**.

**Then copy each file in:**

- For each **`.gs`** file: click **+** next to *Files* → **Script**, type the name *without* `.gs` (for example `Config`), then replace the contents with the file's contents from this folder.
- For each **`.html`** file: click **+** → **HTML**, type the name *without* `.html` (for example `Index`), then replace the contents.
- For **`appsscript.json`** and the existing **`Code.gs`**: open them and replace their contents.

File names must match exactly, including capital letters: `Config`, `Code`, `Postcode`, `Records`, `Documents`, `Setup`, `Index`, `Styles`, `Client`, `Logo`.

`Logo.html` is one very long line of text. Copy all of it.

Click **💾 Save project** when done.

## Step 3 – Add the Ideal Postcodes key

1. Go to **⚙ Project Settings** → **Script Properties** → **Add script property**.
2. Property: `IDEAL_POSTCODES_API_KEY`
   Value: the charity's API key.
3. Click **Save script properties**.

Never paste the key into any of the code files.

**Also, in your Ideal Postcodes account dashboard:**

- Set a **daily lookup limit** on the key (for example 200 a day). Because the lookup runs on Google's servers, the "allowed URLs" restriction can't protect this key, so the daily limit is what stops a misbehaving bot from using up your balance.
- Consider setting a **low balance alert** so you know when to top up.

## Step 4 – Check the settings in `Config.gs`

Open `Config.gs` and check:

- `PRIVACY_NOTICE_URL` – add the link to the charity's privacy notice. While it's empty, the form simply doesn't show a privacy link.
- `SPREADSHEET_NAME` – `nba-gift-aid-declaration-2026`.
- `NOTIFY_CHARITY` – set to `false` if you don't want a notice email for every declaration.
- `FAVICON_URL` – optional: an https link to a small PNG to show as the browser tab icon.

Save.

## Step 5 – Run setup

1. At the top of the editor, choose **`setup`** from the function list, then click **▶ Run**.
2. Google asks for permission. Click **Review permissions**, choose connect@, then **Allow**.
   - If you see *"Google hasn't verified this app"*, click **Advanced** → **Go to NBA Gift Aid declaration (unsafe)**. This is normal for a script you've written yourself.
   - The permissions are for: the spreadsheet, Drive (folder and PDFs), calling Ideal Postcodes, and sending email.
3. When it finishes, the **Execution log** shows links to:
   - the **NBA Gift Aid declarations** folder in connect@'s Drive,
   - the **Declaration PDFs** folder inside it,
   - the **nba-gift-aid-declaration-2026** spreadsheet.

`setup()` is safe to run again. It won't create duplicates or touch existing rows.

## Step 6 – Test the pieces

Run each of these from the function list and read the Execution log:

| Function | What it checks |
|---|---|
| `checkSetup` | The key is set, the spreadsheet and folder exist, how many emails can be sent today |
| `testPostcodeLookup` | Looks up **ID1 1QD**, Ideal Postcodes' free test postcode (no charge). You should see a list of addresses. |
| `testPdf` | Makes a sample PDF in the Declaration PDFs folder. Open it and check the layout and logo. |
| `testEmail` | Sends a sample confirmation email, with the PDF, to connect@ |

Move the sample PDFs to the bin afterwards.

## Step 7 – Deploy the web app

1. Click **Deploy** → **New deployment**.
2. Click the **⚙** next to *Select type* → **Web app**.
3. Fill in:
   - **Description:** `First release`
   - **Execute as:** **Me (connect@nottinghambengaliassociation.co.uk)**
   - **Who has access:** **Anyone**
4. Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).

That URL is the form's link.

> **No "Anyone" option?** Your Workspace admin needs to allow sharing outside the organisation for Drive and Apps Script (Google Admin console → search "sharing settings"). Without it, only people signed in to the charity's Workspace can open the form.

## Step 8 – Try it end to end

1. Open the web app URL on your phone (not signed in to anything) and on a computer.
2. Fill in the form using the postcode **ID1 1QD** and your own email address.
3. Check that:
   - a row appears in the spreadsheet, with an **Open PDF** link in column Q,
   - the PDF looks right,
   - the confirmation email arrives with the PDF attached,
   - connect@ receives the notice email.
4. Also try: submitting with missing fields, a wrong postcode, and **Enter address manually**.
5. Delete the test rows from the spreadsheet and move the test PDFs to the bin.

Test references use up numbers (for example NBA-GAD-2026-0003). That's fine. Gaps in the numbering don't matter.

## Step 9 – Share with trustees

Share the **NBA Gift Aid declarations** folder (not the web app) with the trustees who need it:

- Right-click the folder in Drive → **Share** → add each trustee's email.
- Give **Editor** access to whoever handles cancellations and claims, **Viewer** to others.
- Keep *General access* set to **Restricted**. Never use "Anyone with the link" – the folder holds donors' personal details.

## Step 10 – Link it from the website

On the Hostinger website, add a button such as **Make a Gift Aid declaration** linking to the web app URL. Opening it as a full page works best on phones.

The same link can go in WhatsApp groups, newsletters, and QR codes on posters and donation tables.

---

## Updating the app later

With the Makefile: run `make release`.

Without it, publish the change **without changing the link**:

1. **Deploy** → **Manage deployments**.
2. Click the **✏ pencil** on the existing deployment.
3. Under *Version*, choose **New version**, then **Deploy**.

Don't use *New deployment* for updates – that creates a different URL.

---

## Day-to-day running

### When someone asks to cancel

1. Find their row in the spreadsheet (search by name, email or reference).
2. Set **Status** (column N) to **Cancelled** and enter the date in **Cancelled on** (column O). The row turns grey.
3. Don't delete the row or the PDF. HMRC may still ask to see the declaration for donations made before the cancellation.
4. Reply to the donor to confirm.

### When someone changes their name or address

Ask them to fill in the form again with their new details, and mark their old row as Cancelled with a note such as "Replaced by NBA-GAD-2026-0042".

### Claiming Gift Aid

1. Download a fresh copy of HMRC's Gift Aid schedule spreadsheet (.ods).
2. For each Gift Aided donation in the claim period, find the donor's **Active** row in the spreadsheet.
3. Copy columns **A–E** (Title, First name, Last name, House name or number, Postcode) into the schedule. These are already in HMRC's format.
4. Add the **donation date** and **amount** from the charity's bank records.
5. Only claim for donations made on or after the date 4 years before the declaration date, and not after a cancellation date.

### Spreadsheet columns

| Column | Contents |
|---|---|
| A–E | Title, First name (HMRC format, no spaces), Last name, House name or number, Postcode – matching the HMRC schedule |
| F | Reference |
| G | Declaration date and time |
| H | First name exactly as typed |
| I–K | Street, Address line 2, Town or city |
| L | Email |
| M | Wording version (see the Wording tab) |
| N–O | Status and Cancelled on |
| P | Notes (the app also writes here if a PDF or email failed) |
| Q | Link to the PDF |

---

## Changing the declaration wording

1. Edit `declarationParagraphs_()` in `Config.gs`.
2. Change `WORDING.version` (for example to `v2`) and `WORDING.inUseFrom` to today's date.
3. Run `setup()` once – it adds the new wording to the **Wording** tab.
4. Publish a new version (see *Updating the app later*).

Old rows keep their old version number, so you can always see exactly what each donor agreed to.

## Starting a new spreadsheet (for example in 2027)

The current spreadsheet can keep growing indefinitely. If you'd rather start a fresh one each year:

1. Change `SPREADSHEET_NAME` in `Config.gs` (for example `nba-gift-aid-declaration-2027`).
2. In **Project Settings → Script Properties**, delete the `SPREADSHEET_ID` property.
3. Run `setup()` and publish a new version.

Keep the old spreadsheets. Declarations made in earlier years stay in force until cancelled, so the treasurer will need to look in all of them when claiming.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| "Failed to create a script for user…" | Use an incognito window signed in only as connect@. |
| `make push` says "User has not enabled the Apps Script API" | Run `make enable-api`, switch the API on, wait a few minutes, and try again. |
| `make` signed in to the wrong Google account | Delete the file `~/.clasprc.json` and run `make login` again. |
| `make deploy` made a second web app with a new link | `.deployment-id` was missing. Run `make deployments`, put the ID of the original deployment into `.deployment-id`, and archive the extra one under **Deploy → Manage deployments**. |
| The postcode search always says it isn't working | Run `checkSetup` and `testPostcodeLookup`. Check the key in Script Properties, and your balance and daily limit in the Ideal Postcodes dashboard. Donors can still enter their address manually. |
| A row has "PDF not created" or "email not sent" in Notes | The declaration itself is saved. Run `testPdf` / `testEmail` to see the error in the Execution log. If the daily email quota ran out, it resets the next day. |
| The form shows an old version | You probably edited the code without publishing. See *Updating the app later*. |
| Visitors are asked to sign in to Google | The deployment's *Who has access* isn't set to **Anyone**, or your Workspace blocks outside sharing. See Step 7. |
| A banner at the top says the app was made by an Apps Script user | Google sometimes shows this to visitors outside the organisation. It doesn't affect the form. |
| Errors in general | **Executions** (left-hand menu in the editor) lists every run with its error message. |

---

## Good to know

- **Spam protection:** the form has a hidden "honeypot" field that catches simple bots, and repeat submissions from the same person within 10 minutes are ignored.
- **Lookup costs:** a postcode's results are remembered for 6 hours, so repeated searches for the same postcode aren't charged twice. There's also a cap of 60 lookups a minute across all visitors.
- **Very large postcodes:** a few UK postcodes have more than 100 addresses. The lookup shows the first 100; anyone not listed can use **Enter address manually**.
- **UK addresses only:** the form currently requires a UK postcode. UK taxpayers living abroad would need to contact the charity.
- **Email limits:** Google Workspace accounts can send plenty of emails a day for a form like this; `checkSetup` shows how many are left today.
- **PDF page size:** Google's converter decides the final page size. The layout is designed to print well on A4.
- **Data protection:** donors' details are only in the spreadsheet, the PDF folder and connect@'s mailbox. Keep folder access limited to the trustees who need it.
