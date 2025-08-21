# Firebase Authentication Setup Guide

## Step-by-Step Instructions

### 1. Access Firebase Console
- Go to: https://console.firebase.google.com/
- Sign in with your Google account

### 2. Select Your Project
- Find and click on your Firebase project
- If you don't have one, click "Create a project"

### 3. Enable Authentication
- In the left sidebar, click "Authentication"
- Click "Get started" if it's your first time
- Go to the "Sign-in method" tab
- Click on "Google" provider
- Toggle "Enable" switch
- Click "Save"

### 4. Add Authorized Domains
- Still in Authentication settings
- Click on the "Settings" tab (next to "Sign-in method")
- Scroll down to "Authorized domains" section
- Click "Add domain"
- Add these domains one by one:
  ```
  4d328d0c-3224-495e-b4af-ee1b6aac9f74-00-3ite1tuxocrmu.kirk.replit.dev
  *.replit.dev
  localhost
  ```
- Click "Done" after adding each domain

### 5. Get Your Configuration
- Go to Project Settings (gear icon next to "Project Overview")
- Scroll down to "Your apps" section
- Click on the web app icon (</>)
- Copy the following values:
  - `apiKey`
  - `appId` 
  - `projectId`

### 6. Verify Setup
- After adding domains, wait 2-3 minutes for changes to propagate
- Try signing in again

## Current Domain Information
- Your current Replit domain: `4d328d0c-3224-495e-b4af-ee1b6aac9f74-00-3ite1tuxocrmu.kirk.replit.dev`
- This exact domain must be in your Firebase authorized domains list

## Troubleshooting
- If still getting unauthorized domain errors, double-check the domain spelling
- Make sure you're using the exact domain shown in browser address bar
- Firebase changes can take a few minutes to take effect
- Clear browser cache if needed