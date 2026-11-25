import { test as base, expect, type Request } from '@playwright/test'

const API = 'http://localhost:5999'

const guest = { id: 1, username: 'guest', photo: null, bio: '', contacts: [] }
const friend = { id: 2, username: 'alice', photo: null, bio: '' }

const message = (id: number, groupId: number, content: string) => ({
  id,
  content,
  authorId: 2,
  groupId,
  photoUrl: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
})

const chats = [
  {
    id: 10,
    name: 'Book club',
    photo: '/favicon.ico',
    bio: '',
    directMsg: false,
    members: [guest, friend],
    admins: [guest],
    messages: [message(100, 10, 'Next book?')],
  },
  {
    id: 11,
    name: 'alice',
    photo: '/favicon.ico',
    bio: '',
    directMsg: true,
    members: [guest, friend],
    admins: [],
    messages: [message(101, 11, 'See you soon')],
  },
]

// The app only decodes the token; it never checks the signature.
const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
export const token = [
  base64url({ alg: 'none', typ: 'JWT' }),
  base64url({ id: guest.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
  'signature',
].join('.')

interface Fixtures {
  /** Every request the app made to the mocked backend, in order. */
  apiRequests: Request[]
}

export const test = base.extend<Fixtures>({
  apiRequests: [async ({ page }, use) => {
    const apiRequests: Request[] = []

    await page.route(`${API}/**`, async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())
      const json = (status: number, body: unknown) => route.fulfill({ status, json: body })

      if (pathname.startsWith('/socket.io')) return route.abort()
      apiRequests.push(request)
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 })

      if (pathname === '/auth/login') return json(200, { token, user: guest })
      if (pathname === '/users/1') return json(200, guest)
      if (pathname === '/groups') return json(200, chats)
      if (pathname === '/groups/10/messages' && request.method() === 'POST') return json(201, message(102, 10, 'sent'))
      return json(404, { message: `Unmocked: ${request.method()} ${pathname}` })
    })

    await use(apiRequests)
  }, { auto: true }],
})

export { expect }
