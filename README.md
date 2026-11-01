# Inera Doctor Hub

Clinical decision support for doctors and medical students, built by INERA GROUP (Inera Software Pvt. Ltd.).
It is a static web app with no backend, no API keys and no paid services. Everything runs in the browser.

## Files (flat, no folders)
- `index.html` – app shell
- `styles.css` – design and print layout (A4 prescription)
- `app.js` – engines: symptom NLP, ranking, safety, Rx builder, report, records, OCR, voice, calculators, case trainer
- `kb.js` – symptoms (English plus Hindi/Kannada colloquial terms), red flags, and 48 core condition protocols (73 in total including the pain pack)
- `drugs.js` + `drugs2.js` – 110-entry offline formulary (allergy, pregnancy, renal, hepatic, age and cardiac rules), 35 interaction rules, and an Indian brand index (e.g. Combiflam, Ultracet, Pan-D, Telma-AM); a warning flag on harmful combinations (Panderm, Candid-B, Norflox-TZ)
- `kb2.js` – pain pack: about 30 pain conditions, pain descriptors, and red flags (ectopic, torsion, cauda equina, dissection, DVT/PE, cholangitis, SAH, glaucoma)
- `labs.js` – lab report reader (33 parameters plus qualitative tests)
- `web.js` – web connector (NLM RxTerms, ICD-10-CM, openFDA labels, MedlinePlus), with a 7-day cache on the device
- `vercel.json` – static hosting config

## Deploy (free)
1. Create a new GitHub repository and upload all these files to the repository root.
2. On vercel.com, choose Add New → Project, import the repo, set Framework Preset to **Other**, leave the build command empty, and click Deploy.
3. To test locally, double-click `index.html` or run `python3 -m http.server`.

## Features
- **Smart Consult:** type or dictate the complaint (voice uses the browser, en-IN). The app returns triage alerts, the findings it understood (including negations such as "no cough"), ranked differentials, and an editable prescription that has passed the safety engine.
- **Safety engine:** checks allergies (cross-reactivity included), pregnancy, breastfeeding, CKD/eGFR thresholds, liver disease, heart/QT risk, asthma, peptic ulcer, anticoagulants and age 65+. It swaps in alternatives automatically, blocks a drug when it has no safe alternative, allows a prescriber override, checks drug interactions with the patient's current medicines (brand names recognised) and flags duplicates.
- **Prescription and report:** M-A-N schedule, timing, days and quantity. The printable A4 report includes vitals, labs, investigations, advice, return-if warnings, follow-up and an honest outlook. A patient-friendly copy can be pasted into WhatsApp.
- **Attachments:** reports, X-ray/CT/MRI/USG images, photos and videos are attached to the consult. Lab report photos can be read with OCR (Tesseract.js loads free from a CDN the first time).
- **Lab Report Reader, Drug Library, Interaction Checker, Calculators** (BMI with Asian cut-offs, eGFR CKD-EPI 2021, CURB-65, McIsaac, qSOFA, pregnancy EDD, Alvarado), **Patient Records** (stored on the device, with JSON backup and restore) and a **Student Case Trainer**.

## Pain engine
The SOCRATES panel captures site, onset, character, radiation, timing, aggravating and relieving factors, associated features and a 0-10 severity score. The app turns these into clinical findings and ranks the pain conditions. It then builds a pain-control plan by pain type:
- **Nociceptive pain:** a WHO-ladder plan (paracetamol, then an NSAID, then short-course tramadol).
- **Neuropathic pain:** pregabalin, amitriptyline or duloxetine.
- **Visceral colic:** diclofenac.
- **Emergency pain:** treated on the emergency pathway.

Every suggested drug is screened against the patient's safety flags before it is shown.

## Web connection (free, no key)
- **Web Medical Library tab:** search any medicine (NLM RxTerms, the full U.S. drug list) and read its FDA prescribing information (openFDA). The label's interaction text can be checked against a second drug. You can also search any ICD-10 diagnosis and open its NIH MedlinePlus patient-education topic.
- **"Verify online" in the plan:** pulls the FDA boxed warning, contraindications and dosing for every prescribed drug. It flags any label text that mentions another co-prescribed drug, and adds MedlinePlus links to the report.
- **Final-diagnosis field:** suggests ICD-10 codes from the web as you type.
- **Offline behaviour:** when offline or rate-limited, the app says so and keeps working with the offline engine.

openFDA allows 1,000 requests per day per user IP without a key, and results are cached for 7 days.

## Limits
- Covers adult first-line management for 73 conditions (48 core plus about 25 from the pain pack).
- Web sources are U.S. databases. Indian-only drugs (aceclofenac, etoricoxib, domperidone, drotaverine, thiocolchicoside) have no FDA label, and the offline formulary covers them. Paediatric doses are not calculated automatically (the dose is marked "weight-based – verify").
- It does not interpret imaging. Images are attached for the clinician or radiologist.
- It is rule-based, not a licensed clinician. Every prescription must be reviewed and signed by a registered medical practitioner.
- Records live in the browser's localStorage on one device. Export backups regularly.
