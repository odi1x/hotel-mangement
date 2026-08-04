# Rent Flow — DatePicker NaN fix

Small follow-up: opening the "تصفية" modal after navigating away from Analytics showed "undefined NaN" in the date picker until you refreshed the page.

## Cause

`tempFilter` was initialized with `useState({ ...analyticsFilter })`. That initializer only runs ONCE — on first mount. If `analyticsFilter` was still empty at that moment (the mount-sync effect runs slightly later to populate it), `tempFilter` was permanently `{}`. When you opened the modal, DatePicker received `undefined` startDate/endDate → NaN.

## Fix

Snapshot `analyticsFilter` into `tempFilter` at the moment the filter button is clicked. Every open gets a fresh copy of the current state. Same behavior for closing (just toggles state, no snapshot needed).

## Install

```bash
unzip -o rentflow-datepicker-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-datepicker-fix.zip

git add -A
git commit -m "fix: snapshot analyticsFilter into tempFilter on modal open (was stale after nav)"
git push origin design-md-changes
```

## Verify

Navigate away from Analytics, come back, click تصفية. The date picker should show today's month with the current period's dates already selected — no NaN, no undefined.
