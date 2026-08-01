# BYTOK AI

AI destekli Türkçe teknoloji haber platformu.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## İlk admin hesabı

Admin paneli (`/admin`) yalnızca Supabase Auth + `profiles.role = 'admin'` ile açılır. İlk hesap uygulama içinden oluşturulmaz; Supabase Dashboard üzerinden elle hazırlanır.

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Users** → **Add user**.
2. E-posta ve güçlü bir şifre girin; kullanıcıyı oluşturun.
3. Oluşan kullanıcının **User UID** değerini kopyalayın.
4. **SQL Editor** içinde profil satırını ekleyin (RLS nedeniyle ilk admin yalnızca SQL / service role ile yazılır):

```sql
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'USER_UID_BURAYA',
  'admin@ornek.com',
  'Site Admin',
  'admin'
);
```

5. Supabase **Authentication → URL Configuration** içinde Site URL ve Redirect URLs listesine `NEXT_PUBLIC_SITE_URL` değerinizi ve `https://SITENIZ/admin/login?reset=1` adresini ekleyin.
6. `/admin/login` sayfasından e-posta / şifre ile giriş yapın.

Şifre sıfırlama: `/admin/forgot-password` → e-posta bağlantısı → `/admin/login?reset=1` üzerinde yeni şifre.

## Cron ve otomasyon

### CRON_SECRET oluşturma

Güçlü bir rastgele değer üretin ve `.env.local` ile Vercel ortamına ekleyin:

```bash
openssl rand -hex 32
```

```env
CRON_SECRET=üretilen_değer
```

Secret değerini loglara veya tarayıcıya yazmayın.

### Vercel environment variable

Vercel → Project → **Settings** → **Environment Variables** içine en az şunları ekleyin:

- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` / `GEMINI_MODEL`
- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Cron route’larını lokal test etme

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/ingest
```

Aynı header ile `/api/cron/process`, `/api/cron/publish`, `/api/cron/maintenance` çağrılabilir.

### Authorization header örneği

```http
GET /api/cron/publish HTTP/1.1
Authorization: Bearer CRON_SECRET_DEGERI
```

Eksik veya yanlış secret → HTTP 401. Sunucuda `CRON_SECRET` tanımlı değilse → HTTP 503.

### Vercel cron’lar UTC çalışır

`vercel.json` içindeki ifadeler **UTC** saat dilimindedir (Europe/Istanbul değil). Örnek: bakım `0 3 * * *` ≈ yaz saatinde İstanbul 06:00. Plan sınırlarına göre zamanlamalar sonradan değiştirilebilir.

Mevcut programlar:

| Route | Schedule (UTC) |
| --- | --- |
| `/api/cron/ingest` | `0 */2 * * *` (2 saatte bir) |
| `/api/cron/process` | `15 */1 * * *` (saat başı +15dk) |
| `/api/cron/publish` | `*/15 * * * *` (15 dakikada bir) |
| `/api/cron/maintenance` | `0 3 * * *` (günde bir) |

### Manuel admin tetikleme

`/admin/automation` sayfasındaki butonlar aynı runner’ı sunucu tarafında çağırır; `CRON_SECRET` istemciye gönderilmez.

### Toggle’ların etkisi

- `automation_enabled` kapalıysa ingest / process / publish atlanır.
- `ingestion_enabled` kapalıysa yalnızca kaynak tarama atlanır.
- `publishing_enabled` kapalıysa yalnızca otomatik yayın atlanır.
- Bakım görevi toggle’lardan bağımsız çalışır.

## Scripts

- `npm run typecheck` — TypeScript kontrolü
- `npm run lint` — ESLint
- `npm run test` — Vitest
- `npm run build` — üretim derlemesi
