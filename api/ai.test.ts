import { expect, test } from "bun:test";
// @ts-ignore
import { draftAnnouncement, omniEndpoint, parseDraft } from "./_ai.js";

const base = { supabaseUrl: "https://x.supabase.co", publishableKey: "sb_publishable_x", omniUrl: "https://ai.ornek.com/v1", omniKey: "omni-key", buildingId: "b1", userToken: "tok" };
const ok = (j: any) => new Response(JSON.stringify(j));
const chat = (content: string) => ok({ choices: [{ message: { content } }] });

function fake(isManager: any, ai: () => Response) {
  const calls: { url: string; init: any }[] = [];
  const fetchImpl = async (url: string, init: any = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/rest/v1/rpc/is_manager")) return ok(isManager);
    if (url.endsWith("/chat/completions")) return ai();
    return new Response("{}", { status: 404 });
  };
  return { fetchImpl, calls };
}

test("OmniRoute adresi /v1 olsa da olmasa da doğru uca gider", () => {
  expect(omniEndpoint("https://ai.ornek.com/v1/")).toBe("https://ai.ornek.com/v1/chat/completions");
  expect(omniEndpoint("https://ai.ornek.com")).toBe("https://ai.ornek.com/v1/chat/completions");
});

test("yöneticinin notlarından başlık ve metin döner; anahtar yalnızca OmniRoute'a gider", async () => {
  const { fetchImpl, calls } = fake(true, () => chat('```json\n{"title":"Su kesintisi","body":"Cuma 10-14 arası su kesik olacak."}\n```'));
  const out = await draftAnnouncement({ ...base, notes: "cuma 10-14 su kesik", model: "auto", fetchImpl });
  expect(out.status).toBe(200);
  expect(out.body).toEqual({ title: "Su kesintisi", body: "Cuma 10-14 arası su kesik olacak." });
  expect(calls[0].init.headers.Authorization).toBe("Bearer tok");
  expect(JSON.parse(calls[0].init.body)).toEqual({ b: "b1" });
  expect(calls[1].init.headers.Authorization).toBe("Bearer omni-key");
  const sent = JSON.parse(calls[1].init.body);
  expect(sent.model).toBe("auto");
  expect(sent.messages[1].content).toContain("cuma 10-14 su kesik");
});

test("yönetici olmayan kullanamaz, yapay zekâya istek gitmez", async () => {
  const { fetchImpl, calls } = fake(false, () => chat("{}"));
  const out = await draftAnnouncement({ ...base, notes: "asansör bakımda", fetchImpl });
  expect(out.status).toBe(403);
  expect(calls.some((c) => c.url.endsWith("/chat/completions"))).toBe(false);
});

test("oturum yoksa ya da not çok kısa/uzunsa hiçbir yere istek atılmaz", async () => {
  const { fetchImpl, calls } = fake(true, () => chat("{}"));
  expect((await draftAnnouncement({ ...base, userToken: "", notes: "asansör bakımda", fetchImpl })).status).toBe(401);
  expect((await draftAnnouncement({ ...base, notes: "su", fetchImpl })).status).toBe(400);
  expect((await draftAnnouncement({ ...base, notes: "x".repeat(1501), fetchImpl })).status).toBe(400);
  expect(calls.length).toBe(0);
});

test("servis hata verir ya da anlamsız yanıt dönerse kullanıcıya anlaşılır mesaj gider", async () => {
  const down = fake(true, () => new Response("err", { status: 500 }));
  const a = await draftAnnouncement({ ...base, notes: "asansör bakımda", fetchImpl: down.fetchImpl });
  expect(a.status).toBe(502);
  const junk = fake(true, () => chat("Tabii, işte duyurunuz!"));
  const b = await draftAnnouncement({ ...base, notes: "asansör bakımda", fetchImpl: junk.fetchImpl });
  expect(b.status).toBe(502);
  expect(b.body.message).toContain("Taslak");
});

test("JSON etrafında açıklama olsa bile taslak ayıklanır", () => {
  expect(parseDraft('İşte: {"title":"A","body":"B"} umarım beğenirsin')).toEqual({ title: "A", body: "B" });
  expect(parseDraft('{"title":"","body":"B"}')).toBeNull();
});
