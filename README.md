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

## Scripts

- `npm run typecheck` — TypeScript kontrolü
- `npm run lint` — ESLint
- `npm run build` — üretim derlemesi
