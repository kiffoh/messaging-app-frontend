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

**The React state/patterns refactor belongs to the owner.** It exists to build their React
knowledge, not to improve the codebase. Do **not** write the fix, hand over a working
diff, or "just show" the corrected component. Ask the question that leads there, name the
concept in play, point at the file and the symptom, and review what they write. Confirming
or correcting their attempt is wanted. Give a direct answer only when they explicitly ask
for one.

**The TypeScript migration is delegated to Claude.** Normal implementation work, no
teaching constraint.

These interact: typing the domain helps the React work, but writing types that describe
the *current* state shapes would cement the duplicated-state model they are removing.

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

Note that `user` has two competing shapes: `AuthContext` sets it to the **decoded token
claims**, while `App.tsx` and `NewContact.tsx` call `setUser(response.data)` with the
**full server profile** (which includes `contacts`). Because the context effect re-fires
on navigation, the richer object gets overwritten by the token payload.

### Chat state

`App.tsx` is the application shell and owns almost everything:

- `userChats` — the full list from `GET /messages/:userId`
- `displayedChatId` — the selected chat's id
- `displayedChat` — a **copy** of the selected item out of `userChats`
- `authorIdToPhotoURL` — member id → photo URL map for the open chat
- `newChat`, `userClick`, `loading`, `error`

`userChats` and `displayedChat` are kept in sync by two effects that write into each
other (App.tsx:43–61 and 81–91). This is the central design decision in the codebase and
the source of most of its fragility — see "Refactor in progress".

State flows down as props through `ChatContainer` (11 props in, 13 out to
`GroupMessage`), and leaf components mutate `App`'s state directly via drilled setters
(`setUserChats`, `setDisplayedChat`, `setDisplayedChatId`, `setAuthorIdToPhotoURL`).

### Socket.IO

`socketContext/socketContext.tsx` creates the socket inside an effect, so `socket` is
`null` on the first commit. Consumers do not guard for this; it works today only because
`App`'s `loading` gate delays mounting them.

Subscriptions are split across two components:

- `MessageInputForm.tsx` — listens for `newMessage`
- `Messages.tsx` — listens for `messageUpdated`, `messageDeleted`

Both cleanup with `socket.off('event')` and no handler argument, which removes *every*
listener for that event. Both write through `setDisplayedChat`, so events for a chat that
isn't currently open are silently dropped.

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

The owner is refactoring this project to practise better React state modelling. A full
audit exists as a published artifact — 18 findings (`F1`–`F18`) with a six-phase order.
The short version:

**Phase 0** — clean baseline: `npm install`, clear lint, delete the 19 `console.log`
calls, fix the isolated defects below.

**Phase 1** — remove mirrored state. Several components store a value that is a pure
function of other state, plus an effect to sync it: `authorIdToPhotoURL`,
`filteredContacts`/`filteredUsernames` (three sites), `NavBar`'s `userId`/`userPhoto`.
These become `useMemo` or plain expressions.

**Phase 2** — the anchor change. Replace `userChats` + `displayedChat` with a
`chatsReducer` and derive `displayedChat` from `selectedChatId`. Both sync effects go
away. `Messages`' `clickedMessage` ref becomes an `editingMessageId` state.

**Phase 3** — one `useChatSocket(dispatch)` hook for all three events; create the socket
eagerly rather than in an effect.

**Phase 4** — hoist the providers into a single root route, settle on one `user` shape,
put the chat reducer behind a context, switch `NavBar` to `<Link>`.

**Phase 5** — replace the ref-and-`style.display` mobile toggle with state plus a
`useMediaQuery` hook over `matchMedia`.

**Phase 6** — rebuild `UserProfile` as `profile` + `draft`, using `key={userId}` for
reset-on-navigation.

When touching these areas, prefer the target design over patching the current one.

## Known issues

The TypeScript migration fixed only what was mechanical. Everything below is still live
in the code, marked in place with a `TODO(refactor Fn)` comment naming the audit finding.
**Leave these for the owner** — see "Working agreement".

- **Cleanup called instead of returned** (`DisplayedChat.tsx`, F7) — `return clearTimeout(timer)`
  destroys the timer immediately and registers no cleanup, so errors under the chat header
  never clear.
- **Error auto-clear effects loop forever** (`GroupMessage.tsx`, `UserProfile.tsx`,
  `NewContact.tsx`, F6) — the effect depends on an object and its timeout sets a fresh `{}`,
  so it re-fires on a permanent 2–3s heartbeat whether or not an error occurred.
- **Duplicated `chat.messages` guard** (`App.tsx`, F14) — the effect and the render each
  carry their own. Normalising at the fetch boundary would remove both.
- **Dependency arrays that don't match** (F10) — `App.tsx` reads `user` with `[]`;
  `SignUpForm.tsx` and `SignOut.tsx` have no array at all; `checkTokenValidity` is
  recreated every render. These carry `eslint-disable` comments so lint stays clean —
  removing a disable is how you start that piece of work.
- **`window.screen.width`** (`App.tsx`, F11) — the physical display, not the viewport.
- **Blanket `socket.off(event)`** (F8) — drops every listener for the event, not just
  this component's. Both handlers also write through `setDisplayedChat`, so events for a
  chat that is not open are discarded.
- **Profile photo PUT sends a File in a JSON body** (`UserProfile.tsx`) — sets a
  `multipart/form-data` header but passes a plain object, so a new photo will not
  serialise. Needs a real `FormData` body, as `GroupMessage` builds.

Fixed during the migration, because they were mechanical rather than design decisions:
`VITE_DEFAULT_PICTURE` naming, the unguarded `members.filter(...)[0]` in `ProfileHeader`,
`SignOut` returning `undefined`, dead `userLoading` state, unused imports, the 19
`console.log` calls, and the `index.html` entry path and favicon.

Also fixed: the login and signup background images used paths relative to `src/`
(`url('../SignUp/messageIconLeft.jpg')`) when the files live in `public/`, so they never
loaded and the build warned on each one. Anything under `public/` must be referenced
root-relative — `url('/SignUp/messageIconLeft.jpg')` — because Vite copies that directory
to the output root verbatim. Note this applies only to `public/`: the `@import` on line 1
of `login.module.css` points at a real file under `src/` and is correctly relative.

## Gotchas

- `vercel.json` rewrites everything to `/` for client-side routing.
- `NavBar` uses `<a href>`, not `<Link>`, so profile navigation triggers a full page
  reload. That reload is currently what re-establishes auth state across the separate
  `AuthProvider` instances — changing it to `<Link>` requires fixing the provider tree first.
- Types live in `src/types/index.ts`. Where the code disagrees with itself about a shape (see `AuthUser`), the type preserves the disagreement rather than smoothing it over.
- `arraysEqual` in `GroupMessage` is used to detect a duplicate group before creating one.
- The live demo account is `guest` / `iamaguest`.
