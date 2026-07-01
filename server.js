/**
 * ملتقى ماهر — خادم التسجيل (Backend)
 * -------------------------------------------------
 * خادم Node.js / Express بسيط يستقبل بيانات التسجيل من الواجهة،
 * يتحقق منها، يخزّنها في قاعدة بيانات SQLite، ويرسل بريد تأكيد اختياري.
 *
 * التشغيل:
 *   1) npm install
 *   2) انسخ .env.example إلى .env واملأ القيم
 *   3) npm start
 *
 * نقطة النهاية:
 *   POST /api/register   → يستقبل بيانات النموذج (JSON)
 *   GET  /api/registrations → قائمة المسجّلين (محمية بمفتاح إداري)
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ---- قاعدة البيانات ----
const db = new Database(process.env.DB_PATH || 'maher.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    age         INTEGER NOT NULL,
    gender      TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT NOT NULL,
    country     TEXT NOT NULL,
    city        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---- أدوات التحقق ----
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => /^[0-9+\s]{6,20}$/.test(s);

function validate(b) {
  const errors = [];
  const req = ['firstName', 'lastName', 'age', 'gender', 'phone', 'email', 'country', 'city'];
  for (const k of req) {
    if (!b[k] || String(b[k]).trim() === '') errors.push(`الحقل ${k} مطلوب`);
  }
  if (b.email && !isEmail(b.email)) errors.push('صيغة البريد الإلكتروني غير صحيحة');
  if (b.phone && !isPhone(b.phone)) errors.push('صيغة رقم الهاتف غير صحيحة');
  if (b.age && (isNaN(+b.age) || +b.age < 5 || +b.age > 120)) errors.push('العمر غير صالح');
  if (b.gender && !['ذكر', 'أنثى'].includes(b.gender)) errors.push('الجنس غير صالح');
  return errors;
}

// ---- بريد التأكيد (اختياري) ----
let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendConfirmation(to, name) {
  if (!mailer) return;
  await mailer.sendMail({
    from: process.env.MAIL_FROM || 'ملتقى ماهر <no-reply@maher.example>',
    to,
    subject: 'تأكيد التسجيل في ملتقى ماهر الإلكتروني',
    html: `<div dir="rtl" style="font-family:sans-serif;color:#3a2a22">
      <h2>مرحبًا ${name}،</h2>
      <p>تم استلام طلب تسجيلك في ملتقى ماهر الإلكتروني بنجاح. سنتواصل معك قريبًا.</p>
      <p style="color:#6b4e40">فريق ملتقى ماهر</p>
    </div>`,
  });
}

// ---- استقبال التسجيل ----
app.post('/api/register', async (req, res) => {
  const b = req.body || {};
  const errors = validate(b);
  if (errors.length) return res.status(400).json({ ok: false, errors });

  try {
    const stmt = db.prepare(`
      INSERT INTO registrations (first_name, last_name, age, gender, phone, email, country, city)
      VALUES (@firstName, @lastName, @age, @gender, @phone, @email, @country, @city)
    `);
    const info = stmt.run({
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      age: +b.age,
      gender: b.gender,
      phone: b.phone.trim(),
      email: b.email.trim(),
      country: b.country,
      city: b.city.trim(),
    });

    sendConfirmation(b.email, b.firstName).catch((e) => console.error('mail error', e));

    return res.status(201).json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, errors: ['خطأ في الخادم'] });
  }
});

// ---- قائمة المسجّلين (للإدارة فقط) ----
app.get('/api/registrations', (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'غير مصرّح' });
  }
  const rows = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC').all();
  return res.json({ ok: true, count: rows.length, rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ملتقى ماهر — الخادم يعمل على المنفذ ${PORT}`));
