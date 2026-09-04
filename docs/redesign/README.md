# Redesign assets

Save the captures here with **exactly these names** — the root `README.md`
references them:

| Filename | What it should show |
|----------|---------------------|
| `before-login.png` | old "Log in to Money Tracker" — plain dark centred card |
| `before-dashboard.png` | old "Money Tracker" dashboard — flat grid, 💰 emoji, blue links |
| `after-login.png` | new Clario split login — orange shader panel, white card |
| `after-dashboard-light.png` | new Clario dashboard, **light** theme (warm paper) |
| `after-dashboard-dark.png` | new Clario dashboard, **dark** theme |

`.png` or `.jpg` both fine — if you use `.jpg`, update the extensions in the root
`README.md` too.

## Walkthrough video

`export-1788511977788.mp4` is ~194 MB — **too large to commit** (GitHub rejects
>100 MB, and it bloats every clone). Pick one:

1. **Best:** upload it to YouTube / Loom / Vercel and replace the
   `docs/redesign/walkthrough.mp4` link in the root README with that URL.
2. Trim it to a short (~8 s) muted **GIF** or a <10 MB `.mp4` of the hero + the
   §2 gather headline, save as `walkthrough.mp4` / `walkthrough.gif` here, and
   keep the link.

```bash
# example: 10s clip -> compressed mp4 (needs ffmpeg)
ffmpeg -i "C:/Users/abroc/Videos/export-1788511977788.mp4" -t 10 -vf "scale=1280:-2" -crf 30 -an docs/redesign/walkthrough.mp4
```
