/**
 * API des tâches du jour pour la tablette de la maison (onglet Tâches de HomeFlow).
 *
 *   GET  /tasks?date=AAAA-MM-JJ
 *        -> { date, tasks: [{ id, title, assignee, icon, status, checked, time }] }
 *   POST /tasks/complete   { id, date: "AAAA-MM-JJ", checked: true|false }
 *        -> { ok: true, id, status }
 *
 * Même logique que l'app :
 *   - tâches dues un jour  = getTasksForDate()     (src/screens/app/DashboardScreen.tsx)
 *   - statut d'une tâche   = getEffectiveStatus()  (src/utils/taskStatus.ts)
 *   - cocher une récurrente = completions[date]    (comme le modal « Changer le statut »)
 *
 * Jeton séparé de MUSE_API_TOKEN : firebase functions:secrets:set TABLET_TOKEN
 * Famille : TABLET_FAMILY_ID dans functions/.env (même valeur que MUSE_FAMILY_ID).
 */
const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");

if (!getApps().length) initializeApp();
const db = getFirestore();

const TABLET_TOKEN = defineSecret("TABLET_TOKEN");
const TABLET_FAMILY_ID = defineString("TABLET_FAMILY_ID");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_ICONS = {
  cleaning: "🧹", cooking: "🍳", shopping: "🛒", laundry: "👕",
  garden: "🌿", maintenance: "🔧", appointment: "🗓️", other: "📋",
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest();
const isAuthorized = (req) => {
  const match = (req.get("Authorization") ?? "").match(/^Bearer (.+)$/);
  return !!match && crypto.timingSafeEqual(sha256(match[1]), sha256(TABLET_TOKEN.value()));
};

const tasksRef = () => db.collection(`families/${TABLET_FAMILY_ID.value()}/tasks`);

// Lit "AAAA-MM-JJ" sans passer par un fuseau horaire (le serveur est en UTC, l'app en heure locale)
const parts = (s) => s.split("-").map(Number); // [année, mois 1-12, jour]
const dayOfWeek = (s) => { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

// Copie de getTasksForDate (DashboardScreen.tsx)
function isDueOn(task, date) {
  const [, month, day] = parts(date);
  const detail = typeof task.recurrence_detail === "string" ? task.recurrence_detail : "";
  switch (task.recurrence) {
    case "none":
      return task.date === date;
    case "daily":
      return !task.date || task.date <= date;
    case "weekly":
      return detail === String(dayOfWeek(date));
    case "monthly": {
      if (!DATE_RE.test(detail)) return false;
      return parts(detail)[2] === day && (!task.date || task.date <= date);
    }
    case "yearly": {
      if (!DATE_RE.test(detail)) return false;
      const [, dm, dd] = parts(detail);
      return dd === day && dm === month && (!task.date || task.date <= date);
    }
    default:
      return false;
  }
}

// Copie de getEffectiveStatus (taskStatus.ts)
function effectiveStatus(task, date) {
  if (task.recurrence !== "none" && task.completions) return task.completions[date] ?? "pending";
  return task.status ?? "pending";
}

exports.tabletTasks = onRequest(
  { secrets: [TABLET_TOKEN], invoker: "public", maxInstances: 1 },
  async (req, res) => {
    // CORS : la page est sur un autre domaine (GitHub Pages). Le jeton reste la protection.
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Max-Age", "3600");
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }

    if (!isAuthorized(req)) { res.status(401).json({ error: "unauthorized" }); return; }

    const path = req.path.replace(/\/+$/, "");
    try {
      if (req.method === "GET" && path === "/tasks") {
        const date = String(req.query.date ?? "");
        if (!DATE_RE.test(date)) { res.status(400).json({ error: "expected ?date=YYYY-MM-DD" }); return; }

        const snap = await tasksRef().get();
        const tasks = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => isDueOn(t, date))
          .map((t) => {
            const status = effectiveStatus(t, date);
            return {
              id: t.id,
              title: t.title ?? "",
              assignee: t.assigned_to || null,
              icon: CATEGORY_ICONS[t.category] ?? "📋",
              status,
              checked: status === "completed",
              time: null,
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title, "fr"));
        res.json({ date, tasks });
        return;
      }

      if (req.method === "POST" && path === "/tasks/complete") {
        const { id, date, checked } = req.body ?? {};
        if (typeof id !== "string" || !id || id.includes("/")) { res.status(400).json({ error: "bad id" }); return; }
        if (!DATE_RE.test(String(date))) { res.status(400).json({ error: "bad date" }); return; }
        if (typeof checked !== "boolean") { res.status(400).json({ error: "checked must be boolean" }); return; }

        const ref = tasksRef().doc(id);
        const snap = await ref.get();
        if (!snap.exists) { res.status(404).json({ error: "task_not_found" }); return; }
        const task = snap.data();
        if (!isDueOn(task, date)) { res.status(409).json({ error: "task_not_due_that_day" }); return; }

        const status = checked ? "completed" : "pending";
        if (task.recurrence !== "none") {
          // Seulement l'occurrence de ce jour : les autres dates de completions ne bougent pas
          await ref.update(new FieldPath("completions", date), status);
        } else {
          await ref.update({ status });
        }
        res.json({ ok: true, id, status });
        return;
      }

      res.set("Allow", "GET, POST").status(405).json({ error: "method_not_allowed" });
    } catch (e) {
      console.error("tabletTasks", e);
      res.status(500).json({ error: "server_error" });
    }
  }
);
