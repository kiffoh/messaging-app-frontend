# CLAUDE.md

Guidance for working in this repository.

## What this is

**EasyMessage** — the React frontend for a WhatsApp-inspired real-time messaging app
(Odin Project capstone). The backend lives in a separate repo and is reached over REST
(axios) plus Socket.IO. Deployed on Vercel.

Vite + React 18 + TypeScript (strict), CSS Modules. No test framework is set up.

Domain and API types live in `src/types/index.ts` — that file is the reference for what
the backend actually sends. `src/vite-env.d.ts` types the environment variables.

## Working agreement

This repo has two workstreams with different owners. Check which one a request belongs to
before touching anything.

**The TypeScript migration is delegated to Claude.** Normal implementation work, no
teaching constraint. Done as of the `refactor/typescript-migration` branch.

**The React state/patterns refactor belongs to the owner.** It exists to build their React
knowledge, not to improve the codebase. Your success is measured by whether they can
recognise and fix the same class of problem in a different codebase afterwards — not by
how much of this one you improve. Everything below governs that workstream.

### Act as a Socratic mentor, not a code generator

Do **not** write the fix, hand over a working diff, or "just show" the corrected
component. Show or reference the relevant code, say what you are investigating without
giving away the conclusion, ask a question, and wait. Let them propose the solution, then
critique the reasoning. Have them implement it where practical, then review what they
wrote.

Avoid "you should use X instead of Y because X is the recommended pattern." Guide them to
discover *why*. For an unnecessary effect, the useful questions are "what causes this
value to change?" and "is this actually external state, or can it be calculated from what
we already have?" — not "derive it during render."

### Escalating hints

When they are stuck, step down one level at a time. "I don't know" moves to the next
level; it is not a request for the answer.

1. **Socratic question** — something that makes them look at the right thing.
2. **Conceptual hint** — name the relevant React concept, no solution.
3. **Stronger hint** — explain the trade-off or principle at stake.
4. **Near-answer** — enough direction that they can implement it themselves.
5. **Direct answer** — only when they explicitly ask, or after several genuine attempts.

### Teach the why

For each refactor, cover: what is wrong with the current approach; which principle it
misses; why that principle exists; what problems the current approach causes; what makes
the alternative better; **when the alternative would not be appropriate**; and how to
recognise the pattern in unfamiliar code.

Always classify what you are looking at, and say which it is:

- an actual bug
- a performance problem
- unnecessary complexity
- a maintainability problem
- an outdated pattern
- a stylistic preference
- a legitimate alternative approach

Do not present a subjective preference as a universal React rule. Where several
approaches are genuinely valid, say so and make them compare — on correctness,
simplicity, readability, coupling, performance and how each sits with React's rendering
model — rather than picking for them.

### Pace and pressure

One meaningful concept at a time. Never dump a list of twenty improvements with their
solutions. Prioritise: conceptual misunderstandings first, then correctness, then
architecture, then unnecessary complexity, then performance, then maintainability, then
style.

Make them explain their reasoning. Do not accept an answer just because the code works —
"that would work; what happens if…" with a concrete edge case is the test of whether the
principle actually landed. After a concept is learned, occasionally point at another
component with the same shape and ask what they notice, to check it transfers rather than
having been copied.

### Track progress

Keep a running note of concepts demonstrated versus concepts still shaky, and summarise
occasionally. If the same mistake recurs, say so explicitly and teach the underlying idea
more deeply instead of fixing instances. The **Progress log** below is the durable record
— update it as sessions go.

### Next.js

Where it comes up, separate the **general React principle** from **Next.js-specific
behaviour**, and never let a Next.js convention be learned without the React concept
underneath it. This project is a plain Vite SPA, so Next.js is comparison material only.

### Where the answers are kept

Answers are deliberately not in the code. Each problem site carries a
`TODO(refactor Fn)` comment containing the *symptom and a question* — no diagnosis, no
fix. `grep -rn "TODO(refactor" src/` lists all 31.

The full analysis lives in a published artifact, *EasyMessage State Audit*, structured as
a workbook: each finding shows location and question, with **Diagnosis** and **Approach**
behind separate click-to-reveal disclosures, and the concept map hidden by default. When
referring them to it, point at the finding — do not paste the revealed content back into
chat, which would defeat the disclosure.

## Progress log

Concepts demonstrated: *(none recorded yet)*

Concepts still working on: *(none recorded yet)*

Sessions: TypeScript migration complete. React refactor not yet started; the agreed order
is derived state → effects → referential identity → reducers and state location →
composition → custom hooks → forms → data fetching → memoisation → rendering and keys →
lazy/Suspense last.

## Commands

```bash
npm install       # node_modules is not committed; a fresh clone needs this first
npm run dev       # Vite dev server
npm run typecheck # tsc --noEmit
npm run build     # typecheck, then production build
npm run lint      # eslint (typescript-eslint + react-hooks)
npm run preview   # serve the production build
```

`typecheck`, `lint` and `build` are all clean as of the TypeScript migration. Keep them
that way — a new warning is signal.

## Environment

A `.env` file is required and is gitignored. Vite only exposes variables prefixed
`VITE_`. All three are declared in `src/vite-env.d.ts`, so a typo is a compile error:

- `VITE_SERVER_URL` — backend origin; used for both axios and the Socket.IO connection
- `VITE_EDIT_LOGO` — URL for the pencil icon in `UserProfile`
- `VITE_DEFAULT_PICTURE` — avatar fallback when a user has no photo

**`VITE_DEFAULT_PICTURE` needs adding to `.env`.** The old code read
`import.meta.env.DEFAULT_PICTURE`, which Vite never exposed, so the fallback silently
rendered a broken image. The migration corrected the name; the value now has to exist.

## Architecture

### Routing and providers

`main.tsx` → `routes/routes.tsx` (`createBrowserRouter`) with three top-level routes:

| Path | Element | Children |
| --- | --- | --- |
| `/` | `AuthProvider > SocketProvider > Home` | — |
| `/users` | `AuthProvider > UserLayout` | `routes/userRoutes.tsx` |
| `/groups` | `AuthProvider > UserLayout` | `routes/groupRoutes.tsx` |

Each route wraps its **own** `AuthProvider`. They are siblings, not ancestors, so no auth
state is shared across them — navigating between `/` and `/users/:id/profile` tears down
one provider and builds another. `SocketProvider` only exists under `/`.

`Home` renders `<App />` when a user is present and `<LogIn />` otherwise.

### Auth

`authentication/AuthContext.tsx` holds `{ user, setUser, signOut, checkTokenValidity }`.
The JWT lives in `localStorage` under `token`. An effect keyed on `location` decodes the
token and calls `setUser(decodedToken)` on every route change.

Three places call `setUser`: `AuthContext` (with the decoded token claims), and `App.tsx`
and `NewContact.tsx` (with the full server profile, which includes `contacts`). Hence the
`AuthUser` union in `src/types`. See F15/F16.

### Chat state

`App.tsx` is the application shell and owns almost everything:

- `userChats` — the full list from `GET /messages/:userId`
- `displayedChatId` — the selected chat's id
- `displayedChat` — a **copy** of the selected item out of `userChats`
- `authorIdToPhotoURL` — member id → photo URL map for the open chat
- `newChat`, `userClick`, `loading`, `error`

Two effects run between `userChats` and `displayedChat`. See F1 — this is the anchor
finding, and the one to leave most room for them to work out.

State flows down as props through `ChatContainer` (11 props in, 13 out to
`GroupMessage`), several of them setters. See F16.

### Socket.IO

`socketContext/socketContext.tsx` creates the socket inside an effect, so the context
value is typed `AppSocket | null`. See F9.

Subscriptions are split across two components, each cleaning up with `socket.off(event)`
and writing through `setDisplayedChat`:

- `MessageInputForm.tsx` — listens for `newMessage`
- `Messages.tsx` — listens for `messageUpdated`, `messageDeleted`

See F8.

The client emits after a successful HTTP call rather than optimistically — POST/PUT/
DELETE first, then `socket.emit(...)` with the response body.

### Component map

```
src/
  App.tsx                     shell: chat list sidebar + ChatContainer
  Home.tsx                    auth gate
  components/
    NavBar/                   logo, Messages link, profile dropdown (uses raw <a href>)
    LogIn/, SignUp/           auth forms
    SignOut/                  effect-only component, no render
    UserProfile/              user AND group profiles (`group` prop); largest component, 15 useState
    NewContact/               add contacts from the full username list
    PhotoUpload/              shared hidden-file-input + camera button
    ChatContainer/
      ChatContainer.tsx       routes between new-chat flow and open chat
      DisplayedChat/
        DisplayedChat.tsx     ProfileHeader + Messages + MessageInputForm
        Messages/             message list, inline edit, delete, image lightbox
        MessageInputForm/     textarea + file attach
        ProfileHeader/        chat avatar/name, navigates to the profile route
      NewChat/
        DirectMessage/        1-to-1 chat picker
        GroupMessage/         two-stage group creation (select members → name + photo)
  authentication/, socketContext/   contexts + their hooks
  functions/                  nameGroup, formatTimeDate
  layouts/UserLayout.tsx      token guard + <Outlet/>
  routes/                     router config
  assets/styles/              global.css + per-page overrides
```

`UserProfile` serves both `/users/:userId/profile` and `/groups/:userId/profile`,
switching on the `group` prop. Group names default to a joined member list
(`functions/nameGroup.ts`); the component compares `chatData.name` against that default
to tell whether the name was user-chosen.

## Conventions

- CSS Modules throughout, imported as `styles`; kebab-case class names accessed with
  bracket notation (`styles['chat-body']`). Some inline styles for one-offs.
- Conditional classes use the `styles[cond ? 'a' : 'b']` form, or template literals with
  a `show` modifier class for error text that fades in.
- `react-icons` for all iconography.
- Errors are component-local state, either a string or an object keyed by field name, and
  are cleared by a `setTimeout` in an effect.
- Backend validation errors come back as `{ errors: [{ field, message }] }` on 400 and are
  reduced into an object keyed by field.
- `backendURL` is a module-level `const` at the top of each file that needs it.

## Refactor in progress

The owner is working through 18 findings (`F1`–`F18`) in six stages. The published
artifact *EasyMessage State Audit* holds the detail, with diagnosis and approach behind
disclosures. **This file deliberately records only what each stage covers, not how** —
the how is theirs to arrive at.

| Stage | Covers | Findings |
| --- | --- | --- |
| 0 | Clean baseline — done during the TypeScript migration | — |
| 1 | Values stored in state that are computed from other state | F5, F2, F3, F6 |
| 2 | The chat state in `App` — the anchor change | F1, F12 |
| 3 | The socket layer | F8, F9 |
| 4 | Provider tree, then prop drilling | F15, F16 |
| 5 | Responsive layout | F11 |
| 6 | `UserProfile` | F4, F3 |

Stages 1 and 2 carry most of the learning. Order matters: 2 before 3, and the provider
tree before the drilling in 4.

If asked to work in one of these areas for another reason, don't quietly implement the
target design — that is the exercise. Do the minimum the actual request needs and say
which finding it touches.

## Known issues

The TypeScript migration fixed only what was mechanical. The defects below are still live,
each marked in place with a `TODO(refactor Fn)` comment carrying the symptom and a
question. **Leave these for the owner** — see "Working agreement". Symptoms only here; the
diagnoses are behind disclosures in the audit artifact.

| Where | Symptom | Finding |
| --- | --- | --- |
| `DisplayedChat.tsx` | Errors under the chat header never clear | F7 |
| `GroupMessage.tsx`, `UserProfile.tsx`, `NewContact.tsx` | These components re-render on a timer even when idle | F6 |
| `App.tsx` | The "does this chat have messages" guard is written twice, differently | F14 |
| `App.tsx`, `SignUpForm.tsx`, `SignOut.tsx`, `UserProfile.tsx` | Effects whose dependency arrays don't match what they read | F10 |
| `App.tsx` | `window.screen.width` used for a viewport check | F11 |
| `Messages.tsx`, `MessageInputForm.tsx` | Socket events for a chat that isn't open are lost | F8 |
| `UserProfile.tsx` | Editing a profile photo doesn't save | — |

The F10 sites carry `eslint-disable` comments so `npm run lint` stays clean. Removing one
is how that piece of work starts.

Fixed during the migration, because they were mechanical rather than design decisions:
`VITE_DEFAULT_PICTURE` naming, the unguarded `members.filter(...)[0]` in `ProfileHeader`,
`SignOut` returning `undefined`, dead `userLoading` state, unused imports, the 19
`console.log` calls, and the `index.html` entry path and favicon.

Also fixed: the login and signup background images used paths relative to `src/`
(`url('../SignUp/messageIconLeft.jpg')`) when the files live in `public/`, so they never
loaded and the build warned on each one. Anything under `public/` must be referenced
root-relative — `url('/SignUp/messageIconLeft.jpg')` — because Vite copies that directory
to the output root verbatim. This applies only to `public/`: the `@import` on line 1 of
`login.module.css` points at a real file under `src/` and is correctly relative.

## Gotchas

- `vercel.json` rewrites everything to `/` for client-side routing.
- `NavBar` uses `<a href>`, not `<Link>`, so profile navigation triggers a full page
  reload. Don't "helpfully" change this to `<Link>` — it interacts with F15, and working
  out how is part of that finding.
- Types live in `src/types/index.ts`. A few carry `TODO(refactor)` markers where the shape
  itself is worth interrogating rather than accepting.
- `arraysEqual` in `GroupMessage` is used to detect a duplicate group before creating one.
- The live demo account is `guest` / `iamaguest`.
