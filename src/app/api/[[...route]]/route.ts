import { app } from "../../../../server/app.ts";

/** The Hono API (server/app.ts) answers every /api/* request inside Next.js, so there is one dev server and one deploy. */
const handler = (req: Request) => app.fetch(req);

export const GET = handler;
export const POST = handler;
