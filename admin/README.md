# Mb's Pastries & Bakery — Admin Website

This repository contains the private administration website. Its GitHub Pages homepage is `index.html`, which opens the Firebase admin sign-in screen.

## Upload these files

Copy the contents of this folder into the **root** of the `MB-s-Pastries-Bakery Admin` GitHub repository:

- `index.html`
- `app.js`
- `.nojekyll`
- All six `WhatsApp Image ... .jpeg` files
- `firebase.json`
- `firestore.rules`
- `storage.rules`

Do not upload this folder as a nested folder. GitHub Pages needs `index.html` at the repository root.

## Enable GitHub Pages

1. Open the `MB-s-Pastries-Bakery Admin` repository on GitHub.
2. Select **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose branch `main` and folder `/(root)`, then select **Save**.
5. Wait for the Pages deployment to finish. The admin site URL uses the repository's URL slug:
   `https://avitechcorp.github.io/<admin-repository-name>/`

GitHub Pages displays `index.html` as the website; `README.md` is only the repository's instructions page. Keep this repository public if your GitHub plan requires public repositories for Pages.

## Firebase setup

The admin app is configured for the `mb-s-pastries-and-bakery` Firebase project and the `mbspastriesandbakery@gmail.com` admin email. Firebase web configuration is public client configuration; the Firebase rules protect changes.

1. In Firebase Console, create a Firestore database and enable Storage.
2. Under **Authentication → Sign-in method**, enable **Email/Password**.
3. Deploy `firestore.rules` and `storage.rules` from this repository's root:

   ```powershell
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,storage --project mb-s-pastries-and-bakery
   ```

4. Under **Authentication → Settings → Authorized domains**, add `avitechcorp.github.io`.
5. Open the admin Pages URL, select **Create admin account**, enter `mbspastriesandbakery@gmail.com`, choose a password with at least 12 characters, and verify that email before signing in.

The admin and customer Pages URLs must be different repositories, but both sites use the same Firebase project. Admin edits are published to Firestore and appear on the customer site across browsers and devices.
