/**
 * Domain and API types for EasyMessage.
 *
 * These describe what the backend actually sends. Where the current frontend disagrees
 * with itself about a shape, that disagreement is preserved here rather than smoothed
 * over — see `AuthUser` below.
 */

/* ------------------------------------------------------------------ *
 * Core entities
 * ------------------------------------------------------------------ */

export interface User {
  id: number;
  username: string;
  /** null when the user has not uploaded a photo; the UI falls back to VITE_DEFAULT_PICTURE. */
  photo: string | null;
  bio: string;
  /** Only present on the full profile response, not on members embedded in a chat. */
  contacts?: User[];
  createdAtTime?: string;
  createdAtDate?: string;
}

export interface Message {
  id: number;
  content: string;
  authorId: number;
  groupId: number;
  /** Attachment URL; null for text-only messages. */
  photoUrl: string | null;
  /** ISO 8601. Equal to `updatedAt` when the message has never been edited. */
  createdAt: string;
  updatedAt: string;
}

/**
 * A chat — a direct message when `directMsg` is true, otherwise a group.
 * The backend models both with the same "group" record.
 */
export interface Chat {
  id: number;
  name: string;
  photo: string;
  bio: string;
  directMsg: boolean;
  members: User[];
  /** Users allowed to edit a group profile. Empty/absent for direct messages. */
  admins: User[];
  /**
   * Ordered newest-first.
   *
   * Optional because the backend omits it for freshly created chats. App.jsx guards for
   * this in one place and not another — see audit finding F14.
   */
  messages?: Message[];
  createdAtTime?: string;
  createdAtDate?: string;
}

/** A chat that has been through a normalising step, so `messages` is guaranteed. */
export type LoadedChat = Chat & { messages: Message[] };

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

/** The claims actually encoded in the JWT. */
export interface TokenClaims {
  id: number;
  username: string;
  photo: string | null;
  /** Expiry, in seconds since the epoch. */
  exp: number;
  iat?: number;
}

/**
 * What `AuthContext` stores as `user`.
 *
 * TODO(refactor F15/F16): this union is not a design, it is a bug written down.
 * `AuthContext` sets it to `TokenClaims` on every route change, while `App` and
 * `NewContact` set it to the full `User` profile. Consumers read `user.contacts`, which
 * only exists on one branch. Collapsing this to a single type is part of phase 4.
 */
export type AuthUser = TokenClaims | User;

export interface AuthContextValue {
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  signOut: () => void;
  checkTokenValidity: () => boolean;
}

/* ------------------------------------------------------------------ *
 * UI-local view models
 * ------------------------------------------------------------------ */

/**
 * A contact with a selection flag baked in.
 *
 * TODO(refactor F3): selection is UI state being stored inside the data. A `Set<number>`
 * of selected ids alongside the plain `User[]` avoids rebuilding every contact object on
 * each toggle.
 */
export type SelectableUser = User & { selected: boolean };

/** Member id → photo URL, with the default already substituted for null. */
export type AuthorPhotoMap = Record<number, string>;

/* ------------------------------------------------------------------ *
 * API payloads
 * ------------------------------------------------------------------ */

export interface ValidationError {
  field: string;
  message: string;
}

/** Shape of a 4xx body from the backend. */
export interface ApiErrorBody {
  errors?: ValidationError[];
  message?: string;
}

/** Errors keyed by field name, as the forms store them. */
export type FieldErrors = Record<string, string>;

export interface LoginResponse {
  token: string;
}

export interface SignUpResponse {
  token: string;
  user: User;
}

/** `POST /groups/createGroup` and `/groups/createDirectMessage` return one or the other. */
export interface CreateChatResponse {
  newGroup?: Chat;
  existingGroup?: Chat;
}

/** A trimmed user record from `GET /users/usernames`. */
export interface UsernameRecord {
  id: number;
  username: string;
  photo: string | null;
}

/* ------------------------------------------------------------------ *
 * Socket events
 * ------------------------------------------------------------------ */

/**
 * The events this client sends and receives.
 *
 * TODO(refactor F8): `messageDeleted` carries only an id, with no chat id, which is why
 * deletions can only be applied to the currently open chat. Widening this payload is
 * part of consolidating the socket layer.
 */
export interface ServerToClientEvents {
  newMessage: (message: Message) => void;
  messageUpdated: (message: Message) => void;
  messageDeleted: (messageId: number) => void;
}

export interface ClientToServerEvents {
  newMessage: (message: Message) => void;
  messageUpdated: (message: Message) => void;
  messageDeleted: (messageId: number) => void;
}
