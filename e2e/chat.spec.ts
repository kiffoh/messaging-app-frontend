import { test, expect } from './fixtures'

test('an empty login is rejected before any request is made', async ({ page, apiRequests }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Log In' }).click()

  await expect(page.getByText('Username and password are required.')).toBeVisible()
  expect(apiRequests).toHaveLength(0)
})

test('logging in lists the user\'s chats in the sidebar', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Username').fill('guest')
  await page.getByPlaceholder('*********').fill('iamaguest')
  await page.getByRole('button', { name: 'Log In' }).click()

  await expect(page.getByRole('paragraph').filter({ hasText: /^Book club$/ })).toBeVisible()
  await expect(page.getByRole('paragraph').filter({ hasText: /^alice$/ })).toBeVisible()
})

test('sending a message posts its content and clears the input', async ({ page, apiRequests }) => {
  await page.goto('/')
  await page.getByPlaceholder('Username').fill('guest')
  await page.getByPlaceholder('*********').fill('iamaguest')
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.getByRole('paragraph').filter({ hasText: /^Book club$/ }).click()

  const box = page.getByRole('textbox', { name: 'Message' })
  await box.fill('Hello from Playwright')
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(box).toHaveValue('')
  const post = apiRequests.find((r) => r.method() === 'POST' && r.url().endsWith('/messages/10'))
  expect(post?.postData()).toContain('Hello from Playwright')
})
