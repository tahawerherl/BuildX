# BuildX – Free Hosting Pe Deploy Kaise Karein

Ye project **static website** hai (HTML, CSS, JS). Supabase pe data already cloud pe hai, isliye kisi bhi free static host pe deploy kar sakte ho.

---

## Option 1: Netlify (Sabse easy – drag & drop)

1. **Site:** [https://app.netlify.com](https://app.netlify.com)  
   - Sign up (GitHub/Email se free account banao).

2. **Deploy:**
   - Netlify dashboard → **“Add new site”** → **“Deploy manually”**.
   - **“Drag and drop”** wale area mein apna **poora BUILDX folder** (jis mein `index.html`, `script.js`, `style.css`, sab pages aur `config.js` ho) drag karo.
   - Thodi der baad site live ho jayegi, jaise: `https://random-name-123.netlify.app`.

3. **Custom domain (optional):**  
   Site settings → Domain management → “Add custom domain” se apna domain connect kar sakte ho.

---

## Option 2: Vercel

1. **Site:** [https://vercel.com](https://vercel.com)  
   - Sign up (GitHub se recommended).

2. **Deploy (without Git):**
   - Vercel pe **“Add New Project”**.
   - **“Import Third-Party Git Repository”** ki jagah niche **“Deploy with Vercel CLI”** ya **“Upload”** option dekho.  
   - Agar **Vercel CLI** use karna ho:
     - Terminal: `npx vercel` (project folder mein).
     - Poochne par “link to existing project?” → Nahi; folder select karo, deploy ho jayega.

3. **Deploy with GitHub (best):**
   - BUILDX project ko ek **GitHub repository** mein push karo.
   - Vercel → **Add New Project** → GitHub repo select karo.
   - **Root Directory:** repo ka root (jahan `index.html` hai).
   - **Build Command:** khali chhod do (static site).
   - **Output Directory:** `.` (current folder).
   - Deploy click karo → live URL milega.

---

## Option 3: GitHub Pages

1. **GitHub pe repo banao**  
   - BUILDX folder ka sara code push karo (e.g. repo name: `buildx`).

2. **Pages enable karo**  
   - Repo → **Settings** → **Pages**.
   - **Source:** “Deploy from a branch”.
   - **Branch:** `main` (ya jis branch pe code hai).
   - **Folder:** `/ (root)`.
   - Save karo.

3. **URL**  
   - Kuch minutes baad site live:  
     `https://<username>.github.io/buildx/`  
   - Dhyan: GitHub Pages **subpath** use karta hai (`/buildx/`), isliye agar links break hon to `index.html` mein base tag ya relative paths check karo (abhi sab relative hain, usually kaam karenge).

---

## Deploy Se Pehle Check List

- [ ] **config.js** mein Supabase `supabaseUrl` aur `supabaseKey` sahi hain (production Supabase project ke).
- [ ] Sab links **relative** hain (e.g. `index.html`, `seller.html`, `style.css`) – abhi aise hi hain, theek hai.
- [ ] Koi **localhost** ya **file://** path code mein nahi hai – theek hai.

---

## Important Notes

1. **Supabase:**  
   Deploy ke baad bhi app Supabase use karega. Same `config.js` sab jagah chalega; bas Supabase project **public** ho (anon key public use ke liye safe hoti hai Row Level Security ke sath).

2. **HTTPS:**  
   Netlify / Vercel / GitHub Pages sab free HTTPS dete hain. Supabase bhi HTTPS use karta hai, isliye mixed content ka issue nahi aana chahiye.

3. **Env variables (optional):**  
   Agar baad mein Supabase URL/Key **environment variables** mein rakhna chaho (e.g. Netlify/Vercel env vars), to ek chhota build step (e.g. replace in config at build time) add karna padega; abhi ke liye `config.js` mein direct values theek hain.

---

## Short Summary

| Host         | Best for              | URL jaisa                    |
|-------------|------------------------|------------------------------|
| **Netlify** | Drag & drop, no Git   | `https://xyz.netlify.app`    |
| **Vercel**  | GitHub + auto deploy  | `https://xyz.vercel.app`     |
| **GitHub Pages** | Free, repo se deploy | `https://user.github.io/repo/` |

Sabse tez: **Netlify** pe “Deploy manually” → BUILDX folder drag & drop → done.
