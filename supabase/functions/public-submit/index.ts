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

const optionalEnv = (key: string) => Deno.env.get(key) || "";

const createServiceClient = () =>
  createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

const hashLookupPassword = async (value: string) => {
  const secret = requiredEnv("LOOKUP_HASH_SECRET");
  const data = new TextEncoder().encode(`${secret}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const createKoreaDateStamp = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}${get("month")}${get("day")}`;
};

const createKoreaDateValue = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const createNo = (prefix: string) => {
  const date = createKoreaDateStamp();
  const token = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `${prefix}-${date}-${token}`;
};

const requireText = (payload: Record<string, unknown>, key: string) => {
  const value = String(payload[key] || "").trim();
  if (!value) throw new Error(`${key} 값이 필요합니다.`);
  return value;
};

const requireBirthYear = (payload: Record<string, unknown>) => {
  const birthYear = Number(payload.birthYear);
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100) {
    throw new Error("출생연도를 정확히 입력해주세요.");
  }
  return birthYear;
};

const requireEmail = (payload: Record<string, unknown>) => {
  const email = requireText(payload, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("이메일 주소를 정확히 입력해주세요.");
  }
  return email;
};

const requireAdminRole = (payload: Record<string, unknown>) => {
  const value = String(payload.adminRole || payload.admin_role || "").trim();
  if (value !== "super_admin" && value !== "board_admin") {
    throw new Error("권한을 정확히 선택해주세요.");
  }
  return value;
};

const requireBirthDate = (payload: Record<string, unknown>) => {
  const value = requireText(payload, "birthDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error("생년월일을 정확히 입력해주세요.");
  }
  return value;
};

const staffGenderValues = new Set(["male", "female", "other", "undisclosed"]);

const requireStaffGender = (payload: Record<string, unknown>) => {
  const value = String(payload.gender || "").trim();
  if (!staffGenderValues.has(value)) {
    throw new Error("성별을 정확히 선택해주세요.");
  }
  return value;
};

const adminRoleLabel = (role: string) => (role === "super_admin" ? "관리자" : "스텝");

const formatStaffMember = (item: Record<string, unknown>) => ({
  id: item.id,
  email: item.email,
  fullName: item.full_name,
  displayName: item.display_name || item.full_name,
  birthDate: item.birth_date,
  gender: item.gender,
  adminRole: item.admin_role,
  isActive: item.is_active,
  deactivatedAt: item.deactivated_at,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const statusLabel = (status: string) => {
  if (status === "answered") return "답변완료";
  if (status === "checking") return "확인중";
  return "접수";
};

const reservationStatusLabel = (status: string) => {
  if (status === "approved") return "승인";
  if (status === "rejected") return "반려";
  if (status === "canceled") return "취소";
  return "접수";
};

const programStatusValues = new Set(["scheduled", "open", "closed", "finished"]);
const programVisibilityValues = new Set(["private", "public"]);
const programOperationStatusValues = new Set(["normal", "canceled"]);

const programStatusLabel = (status: string) => {
  if (status === "open") return "접수중";
  if (status === "closed") return "접수마감";
  if (status === "finished") return "종료";
  return "접수예정";
};

const requireDateValue = (payload: Record<string, unknown>, key: string) => {
  const value = requireText(payload, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${key} 날짜를 정확히 입력해주세요.`);
  }
  return value;
};

const isDateInRange = (date: string, start: unknown, end: unknown) =>
  typeof start === "string" && typeof end === "string" && start <= date && date <= end;

const requirePositiveInteger = (payload: Record<string, unknown>, key: string) => {
  const value = Number(payload[key]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${key} 값을 1 이상 숫자로 입력해주세요.`);
  }
  return value;
};

const requireProgramStatus = (payload: Record<string, unknown>) => {
  const status = String(payload.status || "scheduled").trim();
  if (!programStatusValues.has(status)) {
    throw new Error("교육 상태를 정확히 선택해주세요.");
  }
  return status === "finished" ? "closed" : status;
};

const requireProgramVisibility = (payload: Record<string, unknown>) => {
  const rawValue = String(payload.visibility || "private").trim();
  const value = rawValue === "archive" ? "public" : rawValue;
  if (!programVisibilityValues.has(value)) {
    throw new Error("교육 노출상태를 정확히 선택해주세요.");
  }
  return value;
};

const requireProgramOperationStatus = (payload: Record<string, unknown>) => {
  const value = String(payload.operationStatus || payload.operation_status || "normal").trim();
  if (!programOperationStatusValues.has(value)) {
    throw new Error("교육 운영상태를 정확히 선택해주세요.");
  }
  return value;
};

const optionalText = (payload: Record<string, unknown>, key: string) => {
  const value = String(payload[key] || "").trim();
  return value || null;
};

const formatProgram = (item: Record<string, unknown>) => ({
  id: item.id,
  title: item.title,
  summary: item.summary,
  content: item.content,
  imageUrl: item.image_url,
  place: item.place,
  instructor: item.instructor,
  instructorPhone: item.instructor_phone,
  target: item.target,
  capacity: item.capacity,
  startDate: item.start_date,
  endDate: item.end_date,
  applyStartDate: item.apply_start_date,
  applyEndDate: item.apply_end_date,
  status: item.status,
  statusLabel: programStatusLabel(String(item.status || "")),
  visibility: item.visibility === "private" || item.is_active === false ? "private" : "public",
  operationStatus: item.operation_status || "normal",
  cancelReason: item.cancel_reason,
  canceledAt: item.canceled_at,
  isActive: item.is_active,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const formatPublicProgram = (item: Record<string, unknown>) => ({
  id: item.id,
  title: item.title,
  summary: item.summary,
  content: item.content,
  imageUrl: item.image_url,
  place: item.place,
  target: item.target,
  capacity: item.capacity,
  startDate: item.start_date,
  endDate: item.end_date,
  applyStartDate: item.apply_start_date,
  applyEndDate: item.apply_end_date,
  status: item.status,
  statusLabel: programStatusLabel(String(item.status || "")),
  visibility: item.visibility === "private" || item.is_active === false ? "private" : "public",
  operationStatus: item.operation_status || "normal",
  isActive: item.is_active,
});

const maskName = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return "익명";
  const chars = Array.from(text);
  return `${chars[0]}${"*".repeat(Math.max(0, chars.length - 1))}`;
};

const maskTitle = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return "비공개 문의";
  const chars = Array.from(text);
  return `${chars[0]}${"*".repeat(Math.max(0, chars.length - 1))}`;
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

const bearerToken = (request: Request) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
};

const requireSuperAdmin = async (request: Request, supabase: ReturnType<typeof createClient>) => {
  const token = bearerToken(request);
  if (!token) throw new Error("관리자 인증 정보가 필요합니다.");

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error("관리자 인증을 확인할 수 없습니다.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, admin_role, email")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.role !== "admin" || profile?.admin_role !== "super_admin") {
    throw new Error("관리자만 사용할 수 있는 기능입니다.");
  }

  return profile;
};

const requireBoardAdmin = async (request: Request, supabase: ReturnType<typeof createClient>) => {
  const token = bearerToken(request);
  if (!token) throw new Error("관리자 인증 정보가 필요합니다.");

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error("관리자 인증을 확인할 수 없습니다.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, admin_role, email")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (profile?.role !== "admin" || !["super_admin", "board_admin"].includes(String(profile?.admin_role || ""))) {
    throw new Error("관리자 또는 스텝만 사용할 수 있는 기능입니다.");
  }

  return profile;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value);
  return toHex(await crypto.subtle.digest("SHA-256", data));
};

const hmac = async (key: ArrayBuffer | Uint8Array, value: string) => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
};

const hmacHex = async (key: ArrayBuffer | Uint8Array, value: string) => toHex(await hmac(key, value));

const r2SigningKey = async (secretAccessKey: string, dateStamp: string) => {
  const dateKey = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, "auto");
  const serviceKey = await hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
};

const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

const safeFileName = (value: string) =>
  String(value || "file")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "file";

const r2Config = () => {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = optionalEnv("R2_BUCKET") || "kkumcenter-gallery";
  const publicBaseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    host: `${accountId}.r2.cloudflarestorage.com`,
  };
};

const createR2PresignedPutUrl = async (path: string, expires = 600) => {
  const config = r2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${config.accessKeyId}/${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodeURIComponent(config.bucket)}/${encodePath(path)}`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  });
  params.sort();
  const canonicalQuery = params.toString();
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    `host:${config.host}`,
    "",
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${dateStamp}/auto/s3/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await r2SigningKey(config.secretAccessKey, dateStamp);
  params.set("X-Amz-Signature", await hmacHex(signingKey, stringToSign));
  return {
    uploadUrl: `https://${config.host}${canonicalUri}?${params.toString()}`,
    publicUrl: `${config.publicBaseUrl}/${encodePath(path)}`,
    bucket: config.bucket,
  };
};

const createR2AuthorizationHeaders = async (method: string, path: string) => {
  const config = r2Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${encodeURIComponent(config.bucket)}/${encodePath(path)}`;
  const payloadHash = await sha256Hex("");
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    `host:${config.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
    "host;x-amz-content-sha256;x-amz-date",
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await r2SigningKey(config.secretAccessKey, dateStamp);
  const signature = await hmacHex(signingKey, stringToSign);
  return {
    url: `https://${config.host}${canonicalUri}`,
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
    },
  };
};

const deleteR2Object = async (path: string) => {
  if (!path || path.includes("..")) return false;
  const request = await createR2AuthorizationHeaders("DELETE", path);
  const response = await fetch(request.url, { method: "DELETE", headers: request.headers });
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 파일 삭제 실패: ${path}`);
  }
  return true;
};

const logAdminAction = async (
  supabase: ReturnType<typeof createClient>,
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  summary: string,
) => {
  const { error } = await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    summary,
  });
  if (error) console.warn("admin log failed", error.message);
};

const findProfileByEmail = async (supabase: ReturnType<typeof createClient>, email: string) => {
  const { data, error } = await supabase.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (error) throw error;
  return data;
};

const findStaffByEmail = async (supabase: ReturnType<typeof createClient>, email: string) => {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, email, full_name, display_name, birth_date, gender, admin_role, is_active, auth_user_id")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const ensureAnotherActiveAdmin = async (supabase: ReturnType<typeof createClient>, email: string) => {
  const { count, error } = await supabase
    .from("staff_members")
    .select("id", { count: "exact", head: true })
    .eq("admin_role", "super_admin")
    .eq("is_active", true)
    .neq("email", email);
  if (error) throw error;
  if (Number(count || 0) < 1) {
    throw new Error("마지막 관리자는 제외하거나 스텝으로 변경할 수 없습니다.");
  }
};

const syncStaffAccess = async (
  supabase: ReturnType<typeof createClient>,
  staff: {
    email: string;
    fullName: string;
    displayName: string;
    birthDate?: string | null;
    adminRole: string;
    isActive: boolean;
  },
) => {
  const { error: allowlistError } = await supabase.from("admin_email_allowlist").upsert({
    email: staff.email,
    admin_role: staff.adminRole,
    note: adminRoleLabel(staff.adminRole),
    is_active: staff.isActive,
  });
  if (allowlistError) throw allowlistError;

  const existingProfile = await findProfileByEmail(supabase, staff.email);
  if (existingProfile?.id) {
    const { error: staffLinkError } = await supabase
      .from("staff_members")
      .update({ auth_user_id: existingProfile.id })
      .ilike("email", staff.email);
    if (staffLinkError) throw staffLinkError;

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        role: staff.isActive ? "admin" : "user",
        admin_role: staff.isActive ? staff.adminRole : null,
        name: staff.displayName,
        birth_date: staff.birthDate || null,
        email: staff.email,
      })
      .eq("id", existingProfile.id);
    if (profileUpdateError) throw profileUpdateError;
    return { invited: false, updatedProfile: true, warning: null };
  }

  if (!staff.isActive) return { invited: false, updatedProfile: false, warning: null };

  const redirectTo = Deno.env.get("ADMIN_LOGIN_REDIRECT") || undefined;
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(staff.email, {
    data: {
      admin_role: staff.adminRole,
      name: staff.displayName,
      full_name: staff.fullName,
      display_name: staff.displayName,
      birth_date: staff.birthDate,
    },
    redirectTo,
  });

  return {
    invited: !inviteError,
    updatedProfile: false,
    warning: inviteError?.message || null,
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "POST 요청만 사용할 수 있습니다." }, 405);

  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { action, payload } = body;
    const data = (payload ?? body) as Record<string, unknown>;

    if (action === "r2-gallery-upload-url") {
      await requireBoardAdmin(request, supabase);
      const fileName = safeFileName(requireText(data, "fileName"));
      const contentType = requireText(data, "contentType").toLowerCase();
      if (!contentType.startsWith("image/")) throw new Error("갤러리에는 이미지 파일만 업로드할 수 있습니다.");

      const draftId = safeFileName(String(data.draftId || crypto.randomUUID()));
      const ext = contentType.includes("webp") ? "webp" : contentType.includes("png") ? "png" : "jpg";
      const baseName = safeFileName(fileName.replace(/\.[^.]+$/, ""));
      const path = `gallery/${draftId}/images/${Date.now()}-${crypto.randomUUID()}-${baseName || "image"}.${ext}`;
      const signed = await createR2PresignedPutUrl(path);
      return json({
        ok: true,
        ...signed,
        path,
        contentType,
        expiresIn: 600,
      });
    }

    if (action === "r2-public-upload-url") {
      await requireBoardAdmin(request, supabase);
      const fileName = safeFileName(requireText(data, "fileName"));
      const contentType = requireText(data, "contentType").toLowerCase();
      const boardType = safeFileName(String(data.boardType || "board"));
      const draftId = safeFileName(String(data.draftId || crypto.randomUUID()));
      const folder = safeFileName(String(data.folder || "files"));
      const extFromName = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
      const ext =
        extFromName ||
        (contentType.includes("jpeg") ? "jpg" : contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "bin");
      const baseName = safeFileName(fileName.replace(/\.[^.]+$/, ""));
      const path = `public/${boardType}/${draftId}/${folder}/${Date.now()}-${crypto.randomUUID()}-${baseName || "file"}.${ext}`;
      const signed = await createR2PresignedPutUrl(path);
      return json({
        ok: true,
        ...signed,
        path,
        contentType,
        expiresIn: 600,
      });
    }

    if (action === "gallery-delete") {
      const admin = await requireSuperAdmin(request, supabase);
      const id = requireText(data, "id");

      const { data: gallery, error: galleryError } = await supabase
        .from("galleries")
        .select("id, title, status")
        .eq("id", id)
        .maybeSingle();
      if (galleryError) throw galleryError;
      if (!gallery) throw new Error("삭제할 갤러리 글을 찾을 수 없습니다.");
      if (gallery.status !== "hidden") throw new Error("숨김 처리된 갤러리 글만 완전삭제할 수 있습니다.");

      const { data: images, error: imageError } = await supabase
        .from("gallery_images")
        .select("storage_path")
        .eq("gallery_id", id);
      if (imageError) throw imageError;

      const { data: attachments, error: attachmentError } = await supabase
        .from("attachments")
        .select("storage_path")
        .eq("target_type", "gallery")
        .eq("target_id", id);
      if (attachmentError) throw attachmentError;

      const paths = [
        ...new Set(
          [...(images || []), ...(attachments || [])]
            .map((file) => String(file.storage_path || "").trim())
            .filter(Boolean),
        ),
      ];
      for (const path of paths) {
        await deleteR2Object(path);
      }

      const { error: attachmentDeleteError } = await supabase
        .from("attachments")
        .delete()
        .eq("target_type", "gallery")
        .eq("target_id", id);
      if (attachmentDeleteError) throw attachmentDeleteError;

      const { error } = await supabase.from("galleries").delete().eq("id", id).eq("status", "hidden");
      if (error) throw error;

      await logAdminAction(
        supabase,
        String(admin.id),
        "delete",
        "gallery",
        id,
        `갤러리 완전삭제: ${gallery.title}`,
      );
      return json({ ok: true, deletedFiles: paths.length });
    }

    if (action === "post-delete") {
      const admin = await requireSuperAdmin(request, supabase);
      const id = requireText(data, "id");

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id, title, status")
        .eq("id", id)
        .maybeSingle();
      if (postError) throw postError;
      if (!post) throw new Error("삭제할 게시글을 찾을 수 없습니다.");
      if (post.status !== "hidden") throw new Error("숨김 처리된 게시글만 완전삭제할 수 있습니다.");

      const { data: attachments, error: attachmentError } = await supabase
        .from("attachments")
        .select("storage_path")
        .eq("target_type", "post")
        .eq("target_id", id);
      if (attachmentError) throw attachmentError;

      const paths = [...new Set((attachments || []).map((file) => String(file.storage_path || "").trim()).filter(Boolean))];
      for (const path of paths) {
        await deleteR2Object(path);
      }

      const { error: attachmentDeleteError } = await supabase
        .from("attachments")
        .delete()
        .eq("target_type", "post")
        .eq("target_id", id);
      if (attachmentDeleteError) throw attachmentDeleteError;

      const { error } = await supabase.from("posts").delete().eq("id", id).eq("status", "hidden");
      if (error) throw error;

      await logAdminAction(
        supabase,
        String(admin.id),
        "delete",
        "post",
        id,
        `게시글 완전삭제: ${post.title}`,
      );
      return json({ ok: true, deletedFiles: paths.length });
    }

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
      const reservationDate = requireDateValue(data, "reservationDate");
      const reservationEndDate = data.endDate ? requireDateValue({ endDate: data.endDate }, "endDate") : reservationDate;
      const startTime = requireText(data, "startTime");
      const endTime = requireText(data, "endTime");
      const lookupPassword = requireText(data, "lookupPassword");
      const headcount = Number(data.headcount);
      const today = createKoreaDateValue();

      if (reservationDate < today) {
        throw new Error("지난 날짜는 예약할 수 없습니다.");
      }

      if (reservationEndDate < reservationDate) {
        throw new Error("예약 종료일은 시작일보다 빠를 수 없습니다.");
      }

      if (startTime >= endTime) {
        throw new Error("예약 종료시간은 시작시간보다 늦어야 합니다.");
      }

      if (!Number.isInteger(headcount) || headcount <= 0) {
        throw new Error("이용 인원은 1명 이상으로 입력해주세요.");
      }

      const { error } = await supabase.from("space_reservations").insert({
        reservation_no: reservationNo,
        space_id: space.id,
        user_id: null,
        applicant_type: "guest",
        applicant_name: requireText(data, "applicantName"),
        phone: requireText(data, "phone"),
        birth_year: requireBirthYear(data),
        region: requireText(data, "region"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        reservation_date: reservationDate,
        reservation_end_date: reservationEndDate,
        start_time: startTime,
        end_time: endTime,
        purpose: requireText(data, "purpose"),
        headcount,
        note: data.note ? String(data.note) : null,
        status: "received",
      });

      if (error) throw error;
      return json({ ok: true, type: "space-reservation", id: reservationNo, status: "received" });
    }

    if (action === "space-lookup") {
      const lookupPassword = requireText(data, "lookupPassword");
      const { data: items, error } = await supabase
        .from("space_reservations")
        .select("reservation_no, applicant_name, phone, birth_year, region, reservation_date, reservation_end_date, start_time, end_time, purpose, headcount, note, status, created_at, spaces(name)")
        .eq("applicant_name", requireText(data, "applicantName"))
        .eq("phone", requireText(data, "phone"))
        .eq("lookup_password_hash", await hashLookupPassword(lookupPassword))
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      const formattedItems = (items || []).map((item) => {
        const space = Array.isArray(item?.spaces) ? item?.spaces[0] : item?.spaces;
        return {
          id: item.reservation_no,
          spaceName: space?.name || "공간",
          applicant: item.applicant_name,
          phone: item.phone,
          birthYear: item.birth_year,
          region: item.region,
          reservationDate: item.reservation_date,
          reservationEndDate: item.reservation_end_date || item.reservation_date,
          startTime: item.start_time,
          endTime: item.end_time,
          purpose: item.purpose,
          headcount: item.headcount,
          note: item.note,
          status: item.status,
          statusLabel: reservationStatusLabel(item.status),
          createdAt: item.created_at,
        };
      });
      return json({
        ok: true,
        item: formattedItems[0] || null,
        items: formattedItems,
      });
    }

    if (action === "program-application") {
      const programName = requireText(data, "programName");
      const { data: program, error: programError } = await supabase
        .from("programs")
        .select("id, capacity, status, visibility, operation_status, is_active, apply_start_date, apply_end_date, end_date")
        .eq("title", programName)
        .eq("is_active", true)
        .eq("status", "open")
        .eq("visibility", "public")
        .eq("operation_status", "normal")
        .maybeSingle();

      if (programError) throw programError;
      if (!program) throw new Error("현재 신청 가능한 프로그램을 찾을 수 없습니다.");

      const today = createKoreaDateValue();
      if (!isDateInRange(today, program.apply_start_date, program.apply_end_date)) {
        throw new Error("현재 모집기간이 아닌 교육입니다.");
      }
      if (typeof program.end_date === "string" && program.end_date < today) {
        throw new Error("이미 종료된 교육은 신청할 수 없습니다.");
      }

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
        birth_year: requireBirthYear(data),
        region: requireText(data, "region"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        status,
        waitlist_order: status === "waiting" ? Number(waitingCount || 0) + 1 : null,
      });

      if (error) throw error;
      return json({ ok: true, type: "program-application", id: applicationNo, status });
    }

    if (action === "program-list") {
      const onlyOpen = Boolean(data.onlyOpen);
      let query = supabase
        .from("programs")
        .select("id, title, summary, content, image_url, place, target, capacity, start_date, end_date, apply_start_date, apply_end_date, status, visibility, operation_status, is_active")
        .eq("is_active", true)
        .eq("operation_status", "normal")
        .order("apply_start_date", { ascending: false });

      if (onlyOpen) {
        const today = createKoreaDateValue();
        query = query
          .eq("status", "open")
          .eq("visibility", "public")
          .lte("apply_start_date", today)
          .gte("apply_end_date", today)
          .gte("end_date", today);
      }
      else query = query.eq("visibility", "public");

      const { data: items, error } = await query;
      if (error) throw error;
      return json({ ok: true, items: (items || []).map(formatPublicProgram) });
    }

    if (action === "program-lookup") {
      const lookupPassword = requireText(data, "lookupPassword");
      const { data: items, error } = await supabase
        .from("program_applications")
        .select("application_no, applicant_name, phone, birth_year, region, status, created_at, programs(title, place, start_date, end_date)")
        .eq("applicant_name", requireText(data, "applicantName"))
        .eq("phone", requireText(data, "phone"))
        .eq("lookup_password_hash", await hashLookupPassword(lookupPassword))
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      const formattedItems = (items || []).map((item) => {
        const program = Array.isArray(item?.programs) ? item?.programs[0] : item?.programs;
        return {
          id: item.application_no,
          programName: program?.title || "프로그램",
          applicant: item.applicant_name,
          phone: item.phone,
          birthYear: item.birth_year,
          region: item.region,
          status: item.status,
          statusLabel: item.status === "waiting" ? "대기" : item.status === "approved" ? "승인" : item.status === "canceled" ? "취소" : "신청완료",
          place: program?.place || "",
          startDate: program?.start_date || "",
          endDate: program?.end_date || "",
          createdAt: item.created_at,
        };
      });
      return json({
        ok: true,
        item: formattedItems[0] || null,
        items: formattedItems,
      });
    }

    if (action === "program-save") {
      const admin = await requireSuperAdmin(request, supabase);
      const programId = String(data.id || "").trim();
      const operationStatus = requireProgramOperationStatus(data);
      const status = operationStatus === "canceled" ? "closed" : requireProgramStatus(data);
      const visibility = operationStatus === "canceled" ? "private" : requireProgramVisibility(data);
      const cancelReason = operationStatus === "canceled" ? requireText(data, "cancelReason") : optionalText(data, "cancelReason");
      const payload: Record<string, unknown> = {
        title: requireText(data, "title"),
        summary: optionalText(data, "summary"),
        content: requireText(data, "content"),
        image_url: optionalText(data, "imageUrl"),
        place: requireText(data, "place"),
        instructor: optionalText(data, "instructor"),
        instructor_phone: optionalText(data, "instructorPhone"),
        target: optionalText(data, "target"),
        capacity: requirePositiveInteger(data, "capacity"),
        apply_start_date: requireDateValue(data, "applyStartDate"),
        apply_end_date: requireDateValue(data, "applyEndDate"),
        start_date: requireDateValue(data, "startDate"),
        end_date: requireDateValue(data, "endDate"),
        status,
        visibility,
        operation_status: operationStatus,
        cancel_reason: operationStatus === "canceled" ? cancelReason : null,
        canceled_at: operationStatus === "canceled" ? new Date().toISOString() : null,
      };
      if (!programId || visibility !== "private") payload.is_active = true;

      const { data: saved, error } = programId
        ? await supabase
            .from("programs")
            .update(payload)
            .eq("id", programId)
            .select("id, title, summary, content, image_url, place, instructor, instructor_phone, target, capacity, start_date, end_date, apply_start_date, apply_end_date, status, visibility, operation_status, cancel_reason, canceled_at, is_active, created_at, updated_at")
            .single()
        : await supabase
            .from("programs")
            .insert(payload)
            .select("id, title, summary, content, image_url, place, instructor, instructor_phone, target, capacity, start_date, end_date, apply_start_date, apply_end_date, status, visibility, operation_status, cancel_reason, canceled_at, is_active, created_at, updated_at")
            .single();

      if (error) throw error;
      await logAdminAction(
        supabase,
        String(admin.id),
        programId ? "update" : "create",
        "program",
        String(saved.id),
        `${programId ? "교육 수정" : "교육 등록"}: ${saved.title}`,
      );
      return json({ ok: true, item: formatProgram(saved) });
    }

    if (action === "program-hide" || action === "program-restore") {
      const admin = await requireSuperAdmin(request, supabase);
      const id = requireText(data, "id");
      const isRestore = action === "program-restore";
      const { data: saved, error } = await supabase
        .from("programs")
        .update(
          isRestore
            ? { visibility: "public", operation_status: "normal", cancel_reason: null, canceled_at: null, is_active: true }
            : { visibility: "private" },
        )
        .eq("id", id)
        .select("id, title, summary, content, image_url, place, instructor, instructor_phone, target, capacity, start_date, end_date, apply_start_date, apply_end_date, status, visibility, operation_status, cancel_reason, canceled_at, is_active, created_at, updated_at")
        .single();

      if (error) throw error;
      await logAdminAction(
        supabase,
        String(admin.id),
        isRestore ? "update" : "hide",
        "program",
        String(saved.id),
        `${isRestore ? "교육 공개 전환" : "교육 비공개 전환"}: ${saved.title}`,
      );
      return json({ ok: true, item: formatProgram(saved) });
    }

    if (action === "program-applicants") {
      await requireSuperAdmin(request, supabase);
      const programId = requireText(data, "programId");
      const { data: items, error } = await supabase
        .from("program_applications")
        .select("id, application_no, applicant_name, phone, birth_year, region, status, created_at")
        .eq("program_id", programId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json({
        ok: true,
        items: (items || []).map((item) => ({
          id: item.id,
          applicationNo: item.application_no,
          applicantName: item.applicant_name,
          phone: item.phone,
          birthYear: item.birth_year,
          region: item.region,
          status: item.status,
          statusLabel: item.status === "waiting" ? "대기" : item.status === "approved" ? "승인" : item.status === "canceled" ? "취소" : "신청완료",
          createdAt: item.created_at,
        })),
      });
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
        birth_year: requireBirthYear(data),
        region: requireText(data, "region"),
        lookup_password_hash: await hashLookupPassword(lookupPassword),
        title: requireText(data, "title"),
        content: requireText(data, "content"),
        status: "received",
      });

      if (error) throw error;
      return json({ ok: true, type: "inquiry", id: inquiryNo, status: "received" });
    }

    if (action === "inquiry-list") {
      const { data: items, error } = await supabase
        .from("inquiries")
        .select("inquiry_no, title, writer_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return json({
        ok: true,
        items: (items || []).map((item) => ({
          id: item.inquiry_no,
          title: maskTitle(item.title),
          writerName: maskName(item.writer_name),
          status: statusLabel(item.status),
          createdAt: item.created_at,
        })),
      });
    }

    if (action === "inquiry-lookup") {
      const lookupPassword = requireText(data, "lookupPassword");
      const { data: item, error } = await supabase
        .from("inquiries")
        .select("inquiry_no, title, content, status, answer, created_at, answered_at")
        .eq("inquiry_no", requireText(data, "inquiryNo"))
        .eq("writer_name", requireText(data, "writerName"))
        .eq("phone", requireText(data, "phone"))
        .eq("lookup_password_hash", await hashLookupPassword(lookupPassword))
        .maybeSingle();

      if (error) throw error;
      return json({
        ok: true,
        item: item
          ? {
              id: item.inquiry_no,
              title: item.title,
              content: item.content,
              status: statusLabel(item.status),
              answer: item.answer,
              createdAt: item.created_at,
              answeredAt: item.answered_at,
            }
          : null,
      });
    }

    if (action === "inquiry-open") {
      const lookupPassword = requireText(data, "lookupPassword");
      const { data: item, error } = await supabase
        .from("inquiries")
        .select("inquiry_no, title, content, status, answer, created_at, answered_at")
        .eq("inquiry_no", requireText(data, "inquiryNo"))
        .eq("lookup_password_hash", await hashLookupPassword(lookupPassword))
        .maybeSingle();

      if (error) throw error;
      return json({
        ok: true,
        item: item
          ? {
              id: item.inquiry_no,
              title: item.title,
              content: item.content,
              status: statusLabel(item.status),
              answer: item.answer,
              createdAt: item.created_at,
              answeredAt: item.answered_at,
            }
          : null,
      });
    }

    if (action === "staff-list") {
      await requireSuperAdmin(request, supabase);

      const { data: items, error } = await supabase
        .from("staff_members")
        .select("id, email, full_name, display_name, birth_date, gender, admin_role, is_active, deactivated_at, created_at, updated_at")
        .order("is_active", { ascending: false })
        .order("admin_role", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json({ ok: true, items: (items || []).map(formatStaffMember) });
    }

    if (action === "staff-save" || action === "admin-register") {
      const admin = await requireSuperAdmin(request, supabase);

      const email = requireEmail(data);
      const fullName = action === "admin-register" ? String(data.fullName || data.name || email.split("@")[0]).trim() : requireText(data, "fullName");
      const displayName = action === "admin-register" ? String(data.displayName || data.name || fullName || email.split("@")[0]).trim() : requireText(data, "displayName");
      const birthDate = action === "admin-register" && !data.birthDate ? null : requireBirthDate(data);
      const gender = action === "admin-register" && !data.gender ? "undisclosed" : requireStaffGender(data);
      const adminRole = action === "admin-register" && !data.adminRole ? "board_admin" : requireAdminRole(data);
      const isActive = data.isActive !== false && data.isActive !== "false";

      const existingStaff = await findStaffByEmail(supabase, email);
      if (
        existingStaff?.admin_role === "super_admin" &&
        (adminRole !== "super_admin" || !isActive) &&
        String(existingStaff.email).toLowerCase() === String(admin.email || "").toLowerCase()
      ) {
        throw new Error("현재 로그인한 관리자의 권한이나 상태는 직접 낮출 수 없습니다.");
      }
      if (existingStaff?.admin_role === "super_admin" && (adminRole !== "super_admin" || !isActive)) {
        await ensureAnotherActiveAdmin(supabase, email);
      }

      const staffPayload = {
        email,
        full_name: fullName,
        display_name: displayName,
        birth_date: birthDate,
        gender,
        admin_role: adminRole,
        is_active: isActive,
        deactivated_at: isActive ? null : new Date().toISOString(),
        updated_by: admin.id,
      };

      if (existingStaff?.id) {
        const { error: staffUpdateError } = await supabase.from("staff_members").update(staffPayload).eq("id", existingStaff.id);
        if (staffUpdateError) throw staffUpdateError;
      } else {
        const { error: staffInsertError } = await supabase.from("staff_members").insert({
          ...staffPayload,
          created_by: admin.id,
        });
        if (staffInsertError) throw staffInsertError;
      }

      const syncResult = await syncStaffAccess(supabase, {
        email,
        fullName,
        displayName,
        birthDate,
        adminRole,
        isActive,
      });

      return json({ ok: true, email, adminRole, ...syncResult });
    }

    if (action === "staff-role-update") {
      const admin = await requireSuperAdmin(request, supabase);

      const email = requireEmail(data);
      const adminRole = requireAdminRole(data);
      const staff = await findStaffByEmail(supabase, email);
      if (!staff) throw new Error("대상 관리자·스텝 정보를 찾을 수 없습니다.");

      if (
        staff.admin_role === "super_admin" &&
        adminRole !== "super_admin" &&
        String(staff.email).toLowerCase() === String(admin.email || "").toLowerCase()
      ) {
        throw new Error("현재 로그인한 관리자의 권한은 직접 낮출 수 없습니다.");
      }
      if (staff.admin_role === "super_admin" && adminRole !== "super_admin") {
        await ensureAnotherActiveAdmin(supabase, email);
      }

      const { error: staffError } = await supabase
        .from("staff_members")
        .update({ admin_role: adminRole, updated_by: admin.id })
        .eq("id", staff.id);
      if (staffError) throw staffError;

      await syncStaffAccess(supabase, {
        email,
        fullName: String(staff.full_name || email),
        displayName: String(staff.display_name || staff.full_name || email),
        birthDate: staff.birth_date ? String(staff.birth_date) : null,
        adminRole,
        isActive: Boolean(staff.is_active),
      });

      return json({ ok: true, email, adminRole });
    }

    if (action === "staff-deactivate") {
      const admin = await requireSuperAdmin(request, supabase);

      const email = requireEmail(data);
      const staff = await findStaffByEmail(supabase, email);
      if (!staff) throw new Error("제외할 관리자·스텝 정보를 찾을 수 없습니다.");
      if (String(staff.email).toLowerCase() === String(admin.email || "").toLowerCase()) {
        throw new Error("현재 로그인한 관리자는 직접 제외할 수 없습니다.");
      }
      if (staff.admin_role === "super_admin") {
        await ensureAnotherActiveAdmin(supabase, email);
      }

      const { error: staffError } = await supabase
        .from("staff_members")
        .update({ is_active: false, deactivated_at: new Date().toISOString(), updated_by: admin.id })
        .eq("id", staff.id);
      if (staffError) throw staffError;

      await syncStaffAccess(supabase, {
        email,
        fullName: String(staff.full_name || email),
        displayName: String(staff.display_name || staff.full_name || email),
        birthDate: staff.birth_date ? String(staff.birth_date) : null,
        adminRole: String(staff.admin_role),
        isActive: false,
      });

      return json({ ok: true, email, isActive: false });
    }

    if (action === "staff-reactivate") {
      const admin = await requireSuperAdmin(request, supabase);

      const email = requireEmail(data);
      const staff = await findStaffByEmail(supabase, email);
      if (!staff) throw new Error("복구할 관리자·스텝 정보를 찾을 수 없습니다.");

      const { error: staffError } = await supabase
        .from("staff_members")
        .update({ is_active: true, deactivated_at: null, updated_by: admin.id })
        .eq("id", staff.id);
      if (staffError) throw staffError;

      const syncResult = await syncStaffAccess(supabase, {
        email,
        fullName: String(staff.full_name || email),
        displayName: String(staff.display_name || staff.full_name || email),
        birthDate: staff.birth_date ? String(staff.birth_date) : null,
        adminRole: String(staff.admin_role),
        isActive: true,
      });

      return json({ ok: true, email, isActive: true, ...syncResult });
    }

    return json({ error: "요청을 처리하지 못했습니다." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "처리 중 문제가 발생했습니다." }, 400);
  }
});
