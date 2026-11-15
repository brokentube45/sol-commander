# Submit + Hosting Checklist (সংক্ষেপে)

> **Deadline: আজ রাত ১১:৫৯** (Local Event-এর সময়)। **লক্ষ্য: রাত ৮–৯টায় Submit।**
> নিয়ম ২০২৫-এর অফিসিয়াল guide + ২০২৬-এর T&C থেকে। ভিডিও/স্লাইডের সীমা ২০২৬-এর guide-এ একবার মিলিয়ে নিও।

---

## 1. এখনই ৫টা কাজ (agent কোড করার সময়)

1. ☐ **Subdomain-এর DNS** দাও (ছড়াতে সময় লাগে)
2. ☐ **VPS-এ Nginx + HTTPS** বসাও, একটা "Hello" পাতা দিয়ে test করো
3. ☐ **NASA API key** নাও (api.nasa.gov, বিনামূল্যে)
4. ☐ **GitHub repo** বানাও (public + LICENSE)
5. ☐ **Demo footage** রেকর্ড করার প্ল্যান করো

---

## 2. Submit-এর আগে অবশ্যই (নিয়ম)

- ☐ **Game-এর link খোলা:** login, password, registration লাগবে না। Private window-এ test
- ☐ **Demo link আলাদা:** ৩০ সেকেন্ড ভিডিও (ইংরেজি subtitle) **অথবা** সর্বোচ্চ ৭ স্লাইড। YouTube/Drive-এ public link। NASA-র সাইটে আপলোড করা যায় না
- ☐ **সবকিছু ইংরেজিতে:** game, README, form
- ☐ **NASA data ব্যবহার** + Data Credits (কোন dataset, কী কাজে, LIVE নাকি ARCHIVED)
- ☐ **সব resource তালিকায়:** library, font, sound, ছবি, কোড (বিনামূল্যের হলেও)। না দিলে পুরস্কার বাতিল হতে পারে → `ASSET-LOG.md`
- ☐ **AI ব্যবহার ঘোষণা:** form-এর "Use of AI", `AI_USE.md`, README, game-এর About
- ☐ **NASA logo / flag / patch নেই**
- ☐ **১৮-র কম কারও ছবি, কণ্ঠ, নাম নেই**
- ☐ **ব্যক্তিগত তথ্য, বিজ্ঞাপন নেই**
- ☐ **Open source:** public repo + **MIT বা Apache-2.0** `LICENSE` (license না দিলে NASA Apache 2.0 ধরে নেয়)
- ☐ **Terms** আর **"Original work"** checkbox
- ☐ **Submit for Judging** চেপে confirmation banner দেখা

---

## 3. Game-এর ভেতরে থাকবে (judge-এর জন্য)

- ☐ How to Play / controls
- ☐ About: credits + AI ঘোষণা + "NASA এই প্রকল্প সমর্থন করে না"
- ☐ Low Quality mode
- ☐ WebGL না থাকলে ফ্রেন্ডলি বার্তা (ফাঁকা পাতা নয়)
- ☐ DONKI না চললে fallback ডেটা + "ARCHIVED" লেখা
- ☐ Console-এ error নেই, প্রথম load দ্রুত

---

## 4. Database লাগবে?

**না।** Game একটা static website। কোনো account, leaderboard বা তথ্য জমানো নেই। Rover-এর নাম শুধু memory-তে।

**NASA API key:** `DEMO_KEY`-এর limit খুব কম, তাই নিজের বিনামূল্যের key নাও। limit ফুরোলেও game চলবে (fallback আছে)।

---

## 5. Hostinger KVM 4-এ host করা

KVM = VPS, তাই নিজে Nginx বসাতে হবে।

**ধাপ ১: DNS**
`game.yourdomain.com`-এর **A record** → VPS-এর IPv4

**ধাপ ২: VPS-এ (Ubuntu)**
```bash
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx
```
Firewall-এ port **80** আর **443** খোলো।

**ধাপ ৩: Build করে আপলোড (নিজের কম্পিউটার থেকে)**
```bash
npm run build
rsync -av dist/ user@VPS_IP:/var/www/solcommander/
```

**ধাপ ৪: Nginx সেটিং** (`/etc/nginx/sites-available/solcommander`)
```nginx
server {
  listen 80;
  server_name game.yourdomain.com;
  root /var/www/solcommander;
  index index.html;

  gzip on;
  gzip_types text/css application/javascript application/json application/wasm image/svg+xml;

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location = /index.html { add_header Cache-Control "no-cache"; }
  location / { try_files $uri $uri/ /index.html; expires 1d; }
}
```
চালু করো:
```bash
sudo ln -s /etc/nginx/sites-available/solcommander /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**ধাপ ৫: HTTPS**
```bash
sudo certbot --nginx -d game.yourdomain.com
```

**ধাপ ৬: Test**
- ☐ Private window
- ☐ মোবাইলের ডেটা
- ☐ আরেকটা কম্পিউটার
- ☐ DevTools → Network: `.wasm` ফাইল `application/wasm` হিসেবে আসছে
- ☐ HTTPS-এর তালা আছে

**অনলাইন রাখো**
- ☐ VPS-এর বিল auto-renew
- ☐ UptimeRobot (বিনামূল্যে) monitor
- ☐ অন্তত কয়েক মাস বন্ধ করো না (ফলাফলের তারিখ আমি জানি না)

**ব্যাকআপ (সুপারিশ):** একই `dist/` Cloudflare Pages বা Netlify-তে বিনামূল্যে রাখো, README-তে "mirror" link দাও। VPS পড়ে গেলে যেন game হারিয়ে না যায়।

---

## 6. যেকোনো domain-এর subdomain চলবে?

**হ্যাঁ।** শর্ত শুধু: public link, login ছাড়া।

- ☐ HTTPS-এ সচল (শুধু IP নয়)
- ☐ ওই subdomain-এ **শুধু game**, কোনো বিজ্ঞাপন বা প্রচার নয়
- ☐ Form, README, demo-তে **একই URL**

---

## 7. GitHub: নতুন খুলতে হবে?

**না।** যেকোনো একটা account চলবে। GitHub বাধ্যতামূলকও নয়। **আসল জমা হলো hosted game-এর link** (judge-রা ফাইল ডাউনলোড করতে পারেন না)। GitHub repo বাড়তি, কিন্তু open source শর্তের জন্য ভালো।

**Repo-তে এগুলো দেখো:**
- ☐ **Public** + `LICENSE`
- ☐ `.env`, API key, গোপন কিছু নেই (git history-তেও)
- ☐ history-তে গোপন কিছু বা AI-বানানো intro ভিডিও ঢুকে গেলে → **চূড়ান্ত অবস্থা দিয়ে নতুন repo** বানাও। নইলে আগের history রাখা যাবে
- ☐ Commit email: GitHub-এর **noreply** email
- ☐ কেউ ১৮-র কম হলে README/profile-এ আসল নাম, ছবি, স্কুলের নাম নয় (Local Lead-কে জিজ্ঞেস করো)
- ☐ Repo-তে শুধু **বিনা বাধায় ব্যবহারযোগ্য asset** (CC0, OSI license, NASA public)
- ☐ **Mixamo / Quaternius-ধরনের** (পুনর্বিতরণ নিষেধ) ফাইল repo-তে নয়

---

## 8. সবচেয়ে বড় ঝুঁকি (মনে রাখো)

| ঝুঁকি | সমাধান |
|---|---|
| Link খোলে না / login চায় | Private window + আরেকটা ডিভাইসে test |
| শেষ মুহূর্তে Submit | রাত ৮–৯টায় করে ফেলো |
| VPS বন্ধ হয়ে গেল | Mirror (Cloudflare/Netlify) |
| Resource তালিকায় বাদ | `ASSET-LOG.md` + `DEPENDENCIES.txt` |
| AI ঘোষণা ভুলে যাওয়া | Form + `AI_USE.md` + README + About |
| ১৮-র কম কারও তথ্য | Local Lead-কে জিজ্ঞেস করো |
