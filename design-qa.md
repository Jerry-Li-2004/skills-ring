# Design QA: Remove workspace breadcrumbs

- Source visual truth: `/var/folders/0n/hbphj99s0zv7qfbf3r7pxp3r0000gn/T/TemporaryItems/NSIRD_screencaptureui_dLSdEG/Screenshot 2026-10-03 at 9.57.02 AM.png`
- Implementation screenshot: Codex in-app Browser capture attached to this task (the browser API did not expose a filesystem path)
- Implementation URL: `http://127.0.0.1:4173/`
- Viewport: 809 × 824 CSS px
- Source pixels: 306 × 94 at the supplied image density
- Implementation pixels: 809 × 824 at device scale factor 1
- State: `My offers & needs` subpage, default demo participant, no modal open

## Full-view comparison evidence

The rendered subpage starts directly with the page heading and supporting copy. The `Workspace > My offers & needs` breadcrumb row and its reserved vertical gap are absent.

## Focused-region comparison evidence

The source crop identifies the exact shared breadcrumb to remove. A focused comparison is sufficient because the requested change is limited to this single shell element; surrounding header, sidebar, page title, and content remain unchanged.

## Required fidelity surfaces

- Fonts and typography: Existing typography remains unchanged; the breadcrumb text is no longer rendered.
- Spacing and layout rhythm: The page heading now occupies the former breadcrumb area without an empty breadcrumb margin.
- Colors and visual tokens: Existing page and navigation tokens remain unchanged.
- Image quality and asset fidelity: No image assets were added, removed, or modified.
- Copy and content: Only the shared `Workspace > {page}` breadcrumb copy was removed.

## Findings

No actionable P0, P1, or P2 differences remain for the requested removal.

## Interaction verification

- Home rendered without the breadcrumb in the accessibility tree.
- `My offers & needs` navigation remained functional and rendered without the breadcrumb.
- Browser console warnings/errors checked: none.

## Comparison history

- Initial comparison: the shared breadcrumb was present on every page.
- Fix: removed the breadcrumb from the shared page shell and deleted its desktop and responsive CSS rules.
- Post-fix evidence: Home and `My offers & needs` both render without the breadcrumb; no empty spacing remains.

## Implementation checklist

- [x] Remove the shared breadcrumb markup.
- [x] Remove obsolete breadcrumb styles at desktop and responsive breakpoints.
- [x] Verify Home and a representative subpage.
- [x] Run tests and production build.

final result: passed
