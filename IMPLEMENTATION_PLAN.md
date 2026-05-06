# Implementation Plan: Custom Shopify Login Flow

Is file mein aapke saare checkpoints aur implementation ki details di gayi hain.

## ✅ Checkpoints Status

- [x] **Checkpoint 1:** `page.login.liquid` bana (Template created)
- [x] **Checkpoint 2:** Storefront API token mila (Token obtained)
- [x] **Checkpoint 3:** Code lagaya + Token replace kiya (Integration complete)
- [x] **Checkpoint 4:** `theme.liquid` mein redirect lagaya (Redirect active)
- [ ] **Checkpoint 5:** Test karo (Testing in progress)

---

## 🛠 Detailed Workflow (Poora Flow)

### Step 1: Frontend Entry
- User `floralive.com/pages/login` par jata hai.
- Apna Email ID dalta hai.

### Step 2: API & Registration Check
- Backend API check karta hai ki user registered hai ya nahi.
- **Not Registered:** Error dikhaya jata hai.
- **Registered:** User ko Shopify ke native login page par bhej diya jata hai.

### Step 3: Shopify Page & Pre-fill
- Shopify login page open hota hai.
- User ka Email pehle se bhara (pre-filled) hota hai.
- User "Continue" par click karta hai.

### Step 4: OTP Verification
- User ke email par 6-digit ka OTP code aata hai.
- User OTP dal kar verify karta hai.

### Step 5: Successful Login
- Verification ke baad user successfully login ho jata hai.
- User ko `floralive.com/account` par redirect kiya jata.

---

## 🚀 To-Do / Testing List

- [ ] Test with an unregistered email to verify the error message.
- [ ] Test with a registered email to verify the redirect.
- [ ] Verify if the email is correctly pre-filled on the Shopify login page.
- [ ] Confirm OTP is received and functional.
- [ ] Check if the final redirect to `/account` works perfectly.
