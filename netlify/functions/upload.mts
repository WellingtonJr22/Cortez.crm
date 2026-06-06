import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { getSessionUser, json } from "../lib/auth.mjs";

// Persistent storage for chat attachments (images, audio, video). Files are kept
// in a Netlify Blobs store so they survive across devices and sessions, instead
// of the previous in-browser object URLs that only worked on one machine.
const STORE = "crm-uploads";

export default async (req: Request, context: Context) => {
  try {
    if (req.method === "POST") return upload(req);
    if (req.method === "GET" && context.params.key) return serve(context.params.key);
    return json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("upload error", err);
    return json({ error: "Internal error" }, { status: 500 });
  }
};

async function upload(req: Request): Promise<Response> {
  // Uploading requires an authenticated team member.
  const session = await getSessionUser(req);
  if (!session) return json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = ext ? `${randomUUID()}.${ext}` : randomUUID();
  const store = getStore(STORE);
  await store.set(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type || "application/octet-stream", name: file.name },
  });

  return json({ file_url: `/api/upload/${key}` }, { status: 201 });
}

async function serve(key: string): Promise<Response> {
  const store = getStore(STORE);
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result) return json({ error: "Arquivo não encontrado." }, { status: 404 });

  const contentType =
    (result.metadata?.contentType as string) || "application/octet-stream";
  return new Response(result.data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export const config: Config = {
  path: ["/api/upload", "/api/upload/:key"],
};
