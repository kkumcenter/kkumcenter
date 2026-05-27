import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const requiredEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} 환경변수가 설정되어 있지 않습니다.`);
  return value;
};

const hashLookupPassword = async (value: string) => {
  const secret = Deno.env.get("LOOKUP_HASH_SECRET") || "kkumcenter-local-secret";
  const data = new TextEncoder().encode(`${secret}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const createNo = (prefix: string) => {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const token = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `${prefix}-${date}-${token}`;
};

const requireText = (payload: Record<string, unknown>, key: string) => {
  const value = String(payload[key] || "").trim();
  if (!value) throw new Error(`${key} 값이 필요합니다.`);
  return value;
};

const getProgramApplyStatus = async (supabase: ReturnType<typeof createClient>, programId: string, capacity: number) => {
  const { count, error } = await supabase
    .from("program_applications")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId)
    .in("status", ["completed", "approved"]);

  if (error) throw error;
  return Number(count || 0) >= capacity ? "waiting" : "completed";
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "POST 요청만 사용할 수 있습니다." }, 405);

  try {
    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { action, payload = {} } = await request.json();
    const data = payload as Record<string, unknown>;

    if (action === "space-reservation") {
      const spaceName = requireText(data, "spaceName");
      const { data: space, error: spaceError } = await supabase
        .from("spaces")
        .select("id")
        .eq("name", spaceName)
        .maybeSingle();

      if (spaceError) throw spaceError;
      if (!space) throw new Error("예약할 공간을 찾을 수 없습니다.");

      const reservationNo = String(data.reservationNo || createNo("R"));
      const reservationDate = requireText(data, "reservationDate");
      const lookupPassword = requireText(data, "lookupPassword");

      const { error } = await supabase.from("space_reservations").insert({
        reservation_no: reservationNo,
        space_id: space.id,
        user_id: null,
        applicant_type: "guest",
        applicant_name: requireText(data, "applicantName"),
        phone: requireText(data, "phone"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        reservation_date: reservationDate,
        start_time: String(data.startTime || "09:00"),
        end_time: String(data.endTime || "18:00"),
        purpose: requireText(data, "purpose"),
        headcount: Number(data.headcount || 1),
        note: data.note ? String(data.note) : null,
        status: "received",
      });

      if (error) throw error;
      return json({ ok: true, type: "space-reservation", id: reservationNo, status: "received" });
    }

    if (action === "program-application") {
      const programName = requireText(data, "programName");
      const { data: program, error: programError } = await supabase
        .from("programs")
        .select("id, capacity")
        .eq("title", programName)
        .maybeSingle();

      if (programError) throw programError;
      if (!program) throw new Error("신청할 프로그램을 찾을 수 없습니다.");

      const applicationNo = String(data.applicationNo || createNo("P"));
      const status = await getProgramApplyStatus(supabase, program.id, Number(program.capacity || 0));
      const lookupPassword = requireText(data, "lookupPassword");

      const { count: waitingCount } = await supabase
        .from("program_applications")
        .select("id", { count: "exact", head: true })
        .eq("program_id", program.id)
        .eq("status", "waiting");

      const { error } = await supabase.from("program_applications").insert({
        application_no: applicationNo,
        program_id: program.id,
        user_id: null,
        applicant_type: "guest",
        applicant_name: requireText(data, "applicantName"),
        phone: requireText(data, "phone"),
        birth_year: Number(data.birthYear),
        region: requireText(data, "region"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        status,
        waitlist_order: status === "waiting" ? Number(waitingCount || 0) + 1 : null,
      });

      if (error) throw error;
      return json({ ok: true, type: "program-application", id: applicationNo, status });
    }

    if (action === "inquiry") {
      const inquiryNo = String(data.inquiryNo || createNo("Q"));
      const lookupPassword = requireText(data, "lookupPassword");

      const { error } = await supabase.from("inquiries").insert({
        inquiry_no: inquiryNo,
        user_id: null,
        writer_type: "guest",
        writer_name: requireText(data, "writerName"),
        phone: requireText(data, "phone"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        title: requireText(data, "title"),
        content: requireText(data, "content"),
        status: "received",
      });

      if (error) throw error;
      return json({ ok: true, type: "inquiry", id: inquiryNo, status: "received" });
    }

    if (action === "inquiry-lookup") {
      const lookupPassword = requireText(data, "lookupPassword");
      const { data: items, error } = await supabase
        .from("inquiries")
        .select("inquiry_no, title, content, status, answer, created_at")
        .eq("writer_name", requireText(data, "writerName"))
        .eq("phone", requireText(data, "phone"))
        .eq("lookup_password_hash", await hashLookupPassword(lookupPassword))
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return json({
        ok: true,
        items: (items || []).map((item) => ({
          id: item.inquiry_no,
          title: item.title,
          content: item.content,
          status: item.status === "answered" ? "답변완료" : item.status === "checking" ? "확인중" : "접수",
          answer: item.answer,
          createdAt: item.created_at,
        })),
      });
    }

    return json({ error: "지원하지 않는 요청입니다." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "처리 중 문제가 발생했습니다." }, 400);
  }
});
