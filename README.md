# Rent Flow — Header dropdown fix + Cleaning in mobile More menu

Two things. Two files.

## 1. Profile menu doesn't open (desktop)

Exact same bug as the notification dropdown a few patches back. The dropdown is portaled to `<body>` but styled with `md:absolute md:top-full md:left-0` — absolute positioning needs a positioned ancestor, and there is none inside `<body>`, so the panel renders at viewport (0,0), invisible under the header. Same `dropdownRef` was assigned to both the outer container AND the portaled panel, so click-outside detection was also broken.

**Fix — same pattern as NotificationsDropdown:**
- Separate `buttonRef` (the profile button) from `dropdownRef` (the portaled panel)
- On open, measure the button's viewport rect (`getBoundingClientRect()`)
- Position the panel with inline `position: fixed`, anchored to the button's rect
- **Auto-flip:** if the button is on the right half of the viewport (its normal RTL home), the panel anchors its right edge to the button's right edge and extends leftward. If it's on the left half, it mirrors. Clamped to viewport gutters either way so the panel never runs off-screen
- Mobile fallback: `top: 64, left: 12, right: 12` — pinned near the top with small side gutters
- Click-outside now correctly checks both refs

Result: profile menu opens right below the profile button on desktop, correctly positioned.

## 2. Cleaning tab missing from mobile "More" menu

Sidebar had it, but I forgot to add it to `MobileMoreMenu.jsx` — which is what shows up when mobile users tap "المزيد" from the bottom nav. Now added:

- Sparkles icon (matches the sidebar)
- Positioned between Expenses and Maintenance (matches sidebar order)
- Gated on `admin OR canClean` (same rule as sidebar)
- Pending-tasks badge (same badge count as the sidebar)

## Files touched (2)

- `src/components/layout/Header.jsx` — profile dropdown position fix
- `src/components/layout/MobileMoreMenu.jsx` — cleaning entry added

## Install

```bash
unzip -o rentflow-header-cleaning-more.zip -d .
cp -r patch/. .
rm -rf patch rentflow-header-cleaning-more.zip

git add -A
git commit -m "fix: header dropdown position (same bug as notif), add cleaning to mobile more menu"
git push origin design-md-changes
```

## Verify

1. **Desktop profile menu:** click your profile picture in the top-right → dropdown appears right below it with "إعدادات الحساب" and "تسجيل الخروج". Clicking elsewhere closes it.
2. **Mobile More menu:** on your phone, tap "المزيد" in the bottom nav → the list should now include "التنظيف" between "المصروفات" and "الصيانة", with a Sparkles icon and pending-count badge.
3. **Cleaning permission:** if you log in as a staff user with `canClean: false`, the Cleaning entry should NOT appear in the More menu.
