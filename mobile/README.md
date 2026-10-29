# OneHealth ID (OH-ID) Mobile Application

**Native iOS & Android Client for the OneHealth ID Healthcare Network**  
*Powered by Sathus Technology Pvt Ltd*

---

## 1. Overview
The `mobile/` directory contains the dedicated React Native + Expo application for OneHealth ID. It is designed to run on both Android and iOS devices, providing native access to digital healthcare identities, QR scanning check-ins, clinical consultations, and hospital operations.

---

## 2. Architectural Boundaries
- **Isolated Workspace**: Independent `package.json` ensuring zero dependency collisions with the Next.js `frontend/`.
- **Zero Insecure Auth**: Authentication is deferred to Phase B (NIST P-256 ECDH + AES-256-GCM application payload encryption). No mock credentials or bypasses exist in this workspace.
- **Privacy & PHI Protection**: Clinical records and diagnoses are strictly excluded from offline persistent storage by default.

---

## 3. Directory Layout
```
mobile/
├── app/                  # Expo Router file-based routes
│   ├── _layout.tsx       # Root Stack Navigation & StatusBar
│   ├── index.tsx         # Platform Navigation Hub
│   ├── (auth)/login.tsx  # Sign In placeholder
│   ├── (patient)/        # Patient Digital Card & PHR
│   ├── (doctor)/         # Clinical Triage & RxPad
│   ├── (reception)/      # QR Scanner & Check-in
│   ├── (admin)/          # Hospital Admin Facility Census
│   └── (super)/          # Super Admin Platform Governance
├── src/
│   ├── components/       # Reusable Native UI primitives
│   └── theme/            # Ported OH-ID Design System tokens
├── __tests__/            # Jest automated test suites
├── app.json              # Application manifest (com.ohid.health)
├── eas.json              # Development, Preview & Production build profiles
├── tsconfig.json         # TypeScript strict configuration
└── package.json          # Expo SDK dependencies
```

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js (v20+ recommended)
- npm (v10+ recommended)
- Expo Go on physical device OR Android Studio / Xcode Simulator

### Installation
```bash
cd mobile
npm install
```

### Development Server
```bash
npm start
```
- Press `a` to open Android Emulator.
- Press `i` to open iOS Simulator.
- Scan the displayed terminal QR code using the **Expo Go** mobile app.

### Quality Verification
```bash
# Type checking
npm run type-check

# Automated tests
npm test

# Linting
npm run lint
```

---

## 5. EAS Build Profiles
The application is preconfigured with EAS build profiles in `eas.json`:
- **`development`**: Builds an Expo Dev Client binary for local debugging.
- **`preview`**: Standalone test APK / TestFlight binary for internal staging and QA.
- **`production`**: Release `.aab` / `.ipa` bundles with zero hardcoded credentials.

---

## 6. Environment Configuration
See `.env.example`. Create `.env.local` to override settings for local development:
```env
EXPO_PUBLIC_API_URL=https://ohid.online/api/v1
EXPO_PUBLIC_APP_ENV=development
```
