This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

### API authentication

All `/api/*` requests except `POST /api/get-access-token` must include a JWT in the `token` request header. The middleware verifies an HS256 signature, requires a numeric `iat` and future `exp` claim, and rejects tokens whose lifetime exceeds five minutes. A numeric `nbf` claim is also checked when present.

Set `JWT_SECRET` in the server environment (for local development, use `.env.local`). It must contain at least 32 bytes. Do not commit the secret to source control.

To request a token, send `POST /api/get-access-token` with a `client-id` header. The response contains `data.token` and `data.expiresIn` (300 seconds). Send the returned value in the `token` header when calling protected APIs.

**Security note:** a client ID is an identifier, not a secret or proof of identity. This token endpoint will issue a valid token to anyone who supplies a client ID, so it does not provide meaningful protection against unauthorized callers. Use authenticated user/device credentials or a trusted server-side issuance flow before relying on JWTs for access control.
