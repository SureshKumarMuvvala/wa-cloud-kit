# CLAUDE.md — wa-cloud-kit

wa-cloud-kit is a public, MIT-licensed (© 2026 Suresh Kumar Muvvala) TypeScript library for the Meta WhatsApp Cloud API, published to npm as `wa-cloud-kit`. Its first consumer is a multi-tenant accounting SaaS that sends invoices with each client's own signature, so **the library is stateless: every call receives the tenant's config.**

- Spec: `docs/specs/wa-cloud-kit.md`. Read it before changing behaviour.
- Facts register: `docs/facts.md`. Source excerpts and hashes: `sources/`.

## Rule 1 — Meta facts come from fetched docs, never from memory

Any API shape, field name, limit, enum value, error code, policy (templates, the customer service window, pricing) or Graph API version **must** carry an ID in `docs/facts.md` (`F-xxx`). That ID must be backed by `sources/<slug>.md` and an entry in `sources/manifest.json`, with the URL and retrieval date.

- **Where to fetch:** use the raw Markdown under `https://developers.facebook.com/documentation/business-messaging/whatsapp/…/*.md`. The index is `…/whatsapp/llms.txt` and the API reference index is `…/whatsapp/reference/llms.txt`. Graph API versioning lives at `https://developers.facebook.com/docs/graph-api/changelog/versions`, which is HTML only.
- **How to fetch:** use `curl -sS -L`. Read the raw text, not a summarizer's paraphrase. Quote exact lines.
- **What to store:** excerpts only (the lines cited), never full page copies. Record `url`, `retrieved`, `bytes` and `sha256` in the manifest.
- **In code:** annotate the constant or schema with the fact ID (`// F-044`).
- **When a fact changes:** update the excerpt, the manifest, the `docs/facts.md` row (with its date), the code and the tests in the same change.
- **Library choices** that are not Meta facts are labelled `[lib]` in the spec.

## Rule 2 — Stop conditions (stop and ask; do not guess)

1. A needed page is unreachable, is only an HTML shell, or needs login. Tell the maintainer the exact URL to attach.
2. A needed behaviour is not on any fetched page. Add a `G-x` row and ask.
3. Pages conflict on something the code depends on. Add a `C-x` row and ask.
4. A re-fetched Markdown page's sha256 has changed and the change touches a cited fact.
5. The work would need a real token, phone number or app secret, a Meta SDK, or stored state.
6. A toolchain pin cannot be met exactly.
7. `pnpm check` would only pass by disabling a lint rule, a compiler flag or a test.

## Toolchain (exact)

- **Package manager:** `pnpm@11.25.0`, set in `packageManager`.
- **Node:** `.nvmrc` `22.22.2`; `engines.node` `">=22"`.
- **TypeScript:** `~6.0` with `strict`, `module`/`moduleResolution` `NodeNext`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **Zod 4:** peer `^4.0.0`, dev `4.5.4`.
- **Tooling:** Vitest; ESLint flat config with `typescript-eslint` `strictTypeChecked`; Prettier; Changesets.
- **Gate:** `pnpm check` (= `build` + `typecheck` + `typecheck:examples` + `lint` + `test`) must pass before every commit. The build comes first because `examples/` import from `dist/` (v0.2 spec §6, D-13).

## Code rules

- ESM only. **Named exports only**; there are no default exports anywhere.
- Every request, response and webhook shape is a Zod 4 schema. Types are inferred from schemas (`z.infer`/`z.input`), never hand-written alongside them.
- Response and webhook schemas are loose (`z.looseObject`), so new Meta fields do not break callers. Request inputs are strict.
- Validate input before any network call. Invalid input raises `WaValidationError`, and no request is sent.
- Transport goes only through the injected `fetch` (default `globalThis.fetch`). There is no Meta SDK and no runtime dependency besides the `zod` peer.
- No global or module-level mutable state, no caching and no storage.
- No `any`, no non-null `!` on external data, no `@ts-ignore`. Use `unknown` plus Zod.
- Errors are typed classes (`WaApiError`, `WaHttpError`, `WaTransportError`, `WaResponseShapeError`, `WaValidationError`). Categorize by Graph `code` only (F-071). **One narrow exception (D-11):** `error_subcode` may be matched, and only against the documented `2388xxx` template-creation group (`2388024`, `2388039`, `2388040`, `2388047`, `2388072`, `2388073`, `2388293`, `2388299`; F-104, F-122, G-17), to yield category `template_creation`. No other subcode is ever matched; `2388019` (G-20) and `132018` (F-123) are excluded.
- Crypto uses WebCrypto (`globalThis.crypto.subtle`) so it runs in Node ≥22 and edge runtimes.

## Security & test data

- Never commit or log access tokens, app secrets, verify tokens or real phone numbers. Error messages and objects never include the token.
- Test values (use only these):
  - token `"test-token"`
  - app secret `"test-app-secret"`
  - verify token `"test-verify-token"`
  - phone-number id `"100000000000001"`
  - WABA id `"200000000000002"`
  - recipients in the fictional `+1555…` range
- Meta's own sample values may appear only inside `sources/` excerpts.
- Tests never hit the network. Use the fake-fetch helper.
- Webhook signatures are verified over the raw body bytes, never over re-serialized JSON.

## Workflow

- Add a changeset (`pnpm changeset`) for every user-visible change.
- Keep the spec, `docs/facts.md` and the code in sync within the same commit.
- Commits use small, descriptive messages. Run `pnpm check` first.
- Commit author for every commit is `Suresh Kumar Muvvala <suresh.kumar0465@gmail.com>`. Keep the `Co-Authored-By: Claude` trailer.
- Maintainer decisions are recorded as `D-x` rows in spec §11. Do not reverse them without asking.
