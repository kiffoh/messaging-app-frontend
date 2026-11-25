import type { Dispatch, SetStateAction } from 'react';

/**
 * Domain and API types for EasyMessage.
 *
 * These describe what the backend actually sends.
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
  admins?: User[];
  /** Ordered newest-first. */
  messages: Message[];
  createdAtTime?: string;
  createdAtDate?: string;
}

/** A chat as the backend sends it: freshly created chats omit `messages`. Use `normaliseChat`. */
export type ApiChat = Omit<Chat, 'messages'> & { messages?: Message[] };

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

export interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked (and, if valid, the profile fetched). */
  loading: boolean;
  setUser: Dispatch<SetStateAction<User | null>>;
  /** Stores the token and sets the user. */
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

/* ------------------------------------------------------------------ *
 * UI-local view models
 * ------------------------------------------------------------------ */

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
  user: User;
}

export interface SignUpResponse {
  token: string;
  user: User;
}

/** `POST /groups/createGroup` and `/groups/createDirectMessage` return one or the other. */
export interface CreateChatResponse {
  newGroup?: ApiChat;
  existingGroup?: ApiChat;
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
 * The events the server broadcasts to every connected client. The client emits none:
 * the server broadcasts after each HTTP call itself.
 */
export interface ServerToClientEvents {
  newMessage: (message: Message) => void;
  messageUpdated: (message: Message) => void;
  messageDeleted: (messageId: number) => void;
}
