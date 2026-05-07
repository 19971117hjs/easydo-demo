# Folge Local Runtime

This folder is the fastest way to boot the recovered packaged app in a local Electron environment.

## Structure

- `dist` -> symlink to the extracted Folge `dist` folder
- local `node_modules` -> contains only Electron for bootstrapping
- extracted app dependencies stay in `/Users/jsh/Desktop/folge_asar_full_app/node_modules`
- `bootstrap.js` -> forces Electron `userData` back to the original Folge app support directory, then loads the recovered main bundle
- local `package.json` -> points to `bootstrap.js`

## First run

```bash
cd /Users/jsh/Desktop/Folge_local_runtime
npm install
npm start
```

## Notes

- This is a runtime shell, not restored source code yet.
- Login, licensing, updates, and external integrations may still depend on remote services.
- Native modules are loaded from the extracted app, so Electron version should stay pinned to `22.3.18`.

## Next step

Use this runtime only to keep the app runnable while recovering readable source into `/Users/jsh/Desktop/Folge_recovered`.
