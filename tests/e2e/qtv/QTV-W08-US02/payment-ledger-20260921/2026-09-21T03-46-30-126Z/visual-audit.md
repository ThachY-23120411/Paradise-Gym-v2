# Exploratory visual audit

DOM run passed 29/29 steps, but this is NOT final acceptance.

- Ledger screenshot correctly shows two KPIs, no status filter/column, statusless receipt access.
- Manual reference input and required validation screenshots match actual DOM.
- Undated PT/Gym customer-care rows correctly show session counts and -- date.
- QR step 13 captured an image element before bitmap decode; screenshot is blank in QR area. Visual evidence FAIL, corrected runner now waits complete/naturalWidth > 0.
- Freeze step 23 had the enabled button below viewport. Evidence incomplete, corrected runner scrolls and annotates the actual button.
- Final run awaits main's completed DTO projection freeze. Preserve this run for traceability.
