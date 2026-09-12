# Install landing page

A single static page. Deploy it at the URL the install QR encodes (the app reads
that URL from `EXPO_PUBLIC_INSTALL_URL`, defaulting to the value in `app.json`).

**Why the QR points here rather than at a store listing:** a printed code on a
platform poster lasts years. Store URLs do not - listings get re-slugged,
bundles get re-published, and a second platform gets added. Encoding this page
means every printed code keeps working, and changing where it sends people is a
one-line edit to `STORES` in `index.html`.

The in-app **Install code** screen renders the live QR for this URL using
`react-native-qrcode-svg`, so staff can show it from a phone at a ticket office
without anything printed at all.

## Deploying

Any static host will do. There is nothing to build:

```
web/install/index.html   →   https://install.meridianrail.example/
```

Set these before release:

- `STORES.ios` - the real App Store URL
- `STORES.android` - the real Play Store URL
- `STORES.web` - where the Expo web build is served (`npx expo export --platform web`)
