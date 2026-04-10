# Vendored Hebcal Source

The runtime app does not call hebcal.com.

Hebcal functionality is served from the local code in [hebcal-service/src/app.js](/workspaces/613/hebcal-service/src/app.js) and the bundled `@hebcal/*` libraries installed into the app image at build time.

If you decide to vendor upstream Hebcal source directly later, keep it under `vendor/hebcal/` and update the service imports to point there explicitly.