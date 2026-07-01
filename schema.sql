-- مخطط قاعدة البيانات لتسجيلات ملتقى ماهر
-- متوافق مع SQLite. للـMySQL/PostgreSQL عدّل أنواع الأعمدة حسب الحاجة.

CREATE TABLE IF NOT EXISTS registrations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name  TEXT    NOT NULL,   -- الاسم الشخصي
  last_name   TEXT    NOT NULL,   -- اسم العائلة
  age         INTEGER NOT NULL,   -- العمر
  gender      TEXT    NOT NULL,   -- الجنس: "ذكر" أو "أنثى"
  phone       TEXT    NOT NULL,   -- رقم الهاتف
  email       TEXT    NOT NULL,   -- البريد الإلكتروني
  country     TEXT    NOT NULL,   -- الدولة
  city        TEXT    NOT NULL,   -- المدينة
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_email ON registrations (email);
CREATE INDEX IF NOT EXISTS idx_reg_created ON registrations (created_at);
