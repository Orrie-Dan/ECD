# User manual — District ECD focal person (Akarere)

**System:** ECD operational app  
**UI language:** Kinyarwanda  
**Role:** Umukozi w’Akarere (`district_focal_person`)  
**Home:** `/district` (Incamake)

This portal is **online**. You monitor what caregivers record; you do not fill the daily ECD Book.

---

## 1. Sign in

1. Open the app → choose the district role.  
2. Sign in with the credentials issued by NCDA / district ICT.  
3. You land on **Incamake**.

If you see **Ntabwo biboneka kuri murongo**, that screen has no live API yet — it is not empty data.

---

## 2. Navigation

**Akarere (command)**

| Menu (RW) | Use it for |
|---|---|
| **Incamake** | District snapshot: centers, children, present today, attendance rate, trends |
| **Ibigo bya ECD** | Search centers; open a center |
| **Abana** | Children across the district |
| **Imikorere** | Monitoring hub — attendance, growth, feeding, STED |
| **Gukurikirana** | Action alerts that need follow-up |
| **Raporo** | Period reports |

**Ubuyobozi**

| Menu | Use it for |
|---|---|
| **Abakoresha** | Caregiver accounts in your district |
| **Igenamiterere** | Profile / settings (live save may be limited) |

GIS map is **not** a separate menu item. Mapping waits for ArcGIS integration; Incamake is the command surface.

---

## 3. Incamake (dashboard)

Typical KPIs:

- Ibigo bya ECD byose  
- Abana bose banditswe  
- Abaje uyu munsi  
- Ijanisha ry’ubwitabire  
- Abanditswe bashya / abavuye muri gahunda (when the API provides them)

Use **Reba Gukurikirana** for alerts, **Reba ibigo byose** for the center list. Filter by period when charts are shown.

---

## 4. Ibigo and Abana

**Ibigo**

- Search by name.  
- Open a center for enrollment, caretaker, and operational snapshot.  
- From a center you can move into that center’s children / monitoring context.

**Abana**

- Search and filter children in the district.  
- Open a child to see profile, attendance, growth (read-only relative to caretaker data entry).  
- Transfers and archive are caretaker/center operations; district sees the result.

---

## 5. Imikorere (monitoring hub)

Tabs:

| Tab | What you check |
|---|---|
| Overview | Hub summary |
| **Ubwitabire** | Which centers submitted today; rates; gaps |
| **Imikurire** | Coverage, overdue measurements, at-risk MUAC |
| **Imirire** | Feeding days / balanced meals reported |
| **STED** | Screening coverage, referrals, follow-up due |

Use date and center filters. This is how you supervise the digital ECD Book without visiting every urugo every day.

---

## 6. Gukurikirana (follow-up)

Alerts are grouped (attendance, enrollment, data quality, operational, nutrition) with priority high / medium / low.

Examples: low attendance, no submission, high-risk nutrition, missed assessment, referral required.

**Kohereza (Ivuriro)** — `/district/referrals` (also linked from Gukurikirana): pending / completed / cancelled referrals from MUAC or STED.

Act in the field (call the center, visit, support the umurezi). The app records the signal; it does not replace supervision visits.

---

## 7. Raporo

Open **Raporo**, pick the report type and period, preview.

**Live limit:** file export (PDF/Excel) may show that export is not available on the live API. Use on-screen preview and your district reporting process until export is enabled.

---

## 8. Abakoresha (caregivers)

List and open caregiver users scoped to your district. Use this to see who can sign in as umurezi — not the paper “abarezi” training/certificate register.

---

## 9. What district does *not* do in this app

- Fill daily attendance, feeding, STED, or growth (that is the umurezi).  
- Run the four National Standards paper inspection checklists (NCDA inspections module is the start of that).  
- Use a live ArcGIS district map (placeholder).  
- Work fully offline (no district IndexedDB workspace).

---

## 10. Support

- If KPIs show “—”, the backend did not return that metric — do not treat it as zero.  
- For login or wrong district scope, contact NCDA / ICT, not the caregiver.
