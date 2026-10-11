import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const categories = [
  { name: "Food", icon: "🍜", color: "food" },
  { name: "Transport", icon: "🚲", color: "transport" },
  { name: "Shopping", icon: "🛍️", color: "shopping" },
  { name: "Bills", icon: "🏠", color: "bills" },
  { name: "Health", icon: "💊", color: "health" },
  { name: "Entertainment", icon: "🎮", color: "entertainment" },
  { name: "Education", icon: "📚", color: "education" },
  { name: "Other", icon: "📦", color: "other" },
];
const themes = [
  { id: "forest", label: "Forest" },
  { id: "ocean", label: "Ocean" },
  { id: "berry", label: "Berry" },
  { id: "sunset", label: "Sunset" },
  { id: "custom", label: "Custom" },
];
const overviewPatterns = [
  { id: "orbit", label: "Orbit" },
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "diagonal", label: "Diagonal" },
  { id: "none", label: "None" },
];
const chartPeriods = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

const initialExpenses = [
  { id: 1, name: "Lunch", amount: 250, category: "Food", note: "Lunch with friends", date: "2026-09-17" },
  { id: 2, name: "Petrol", amount: 500, category: "Transport", note: "Bike fuel", date: "2026-09-16" },
  { id: 3, name: "Shopping", amount: 850, category: "Shopping", note: "Clothes and accessories", date: "2026-09-15" },
  { id: 4, name: "Electricity", amount: 1200, category: "Bills", note: "Monthly electricity bill", date: "2026-09-12" },
  { id: 5, name: "Game", amount: 300, category: "Entertainment", note: "Game purchase", date: "2026-09-10" },
];

const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const emptyForm = { name: "", amount: "", category: "", note: "", date: localDate };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function blendHex(hex, target, amount) {
  const source = hex.replace("#", "");
  const destination = target.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const start = Number.parseInt(source.slice(index, index + 2), 16);
    const end = Number.parseInt(destination.slice(index, index + 2), 16);
    return Math.round(start + (end - start) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function contrastingTextColor(hex) {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const contrast = (other) => (Math.max(luminance, other) + 0.05) / (Math.min(luminance, other) + 0.05);
  return contrast(0.04) >= contrast(1) ? "#17241c" : "#ffffff";
}

function makeChartBuckets(period) {
  const today = new Date();
  const buckets = [];
  if (period === "daily") {
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      buckets.push({ start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1), label: start.toLocaleDateString("en-IN", { weekday: "short" }) });
    }
  } else if (period === "weekly") {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - offset * 7);
      buckets.push({ start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7), label: start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
    }
  } else if (period === "monthly") {
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      buckets.push({ start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), label: start.toLocaleDateString("en-IN", { month: "short" }) });
    }
  } else {
    for (let year = today.getFullYear() - 4; year <= today.getFullYear(); year += 1) {
      buckets.push({ start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1), label: String(year) });
    }
  }
  return buckets.map((bucket) => ({ ...bucket, key: localDateKey(bucket.start) }));
}

function App() {
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = window.localStorage.getItem("expense-tracker-items");
      if (!saved) return initialExpenses;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialExpenses;
    } catch {
      return initialExpenses;
    }
  });
  const [theme, setTheme] = useState(() => {
    try {
      const saved = window.localStorage.getItem("expense-tracker-theme");
      return themes.some((item) => item.id === saved) ? saved : "forest";
    } catch {
      return "forest";
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem("expense-tracker-dark-mode") === "true";
    } catch {
      return false;
    }
  });
  const [customColor, setCustomColor] = useState(() => {
    try {
      const saved = window.localStorage.getItem("expense-tracker-custom-color");
      return saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : "#355f48";
    } catch {
      return "#355f48";
    }
  });
  const [overviewPattern, setOverviewPattern] = useState(() => {
    try {
      const saved = window.localStorage.getItem("expense-tracker-overview-pattern");
      return overviewPatterns.some((item) => item.id === saved) ? saved : "orbit";
    } catch {
      return "orbit";
    }
  });
  const [chartPeriod, setChartPeriod] = useState("monthly");
  const [mobileVisibleCount, setMobileVisibleCount] = useState(6);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(6);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 780px)").matches);
  const [todayKey, setTodayKey] = useState(localDate);
  const [form, setForm] = useState(emptyForm);
  const [importMessage, setImportMessage] = useState("");
  const importInput = useRef(null);
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [expenses]);
  const todayExpenses = useMemo(() => sortedExpenses.filter((expense) => expense.date === todayKey), [sortedExpenses, todayKey]);
  const chartData = useMemo(() => makeChartBuckets(chartPeriod).map((bucket) => ({
    ...bucket,
    total: expenses.reduce((sum, expense) => {
      const expenseDate = new Date(`${expense.date}T00:00:00`);
      return expenseDate >= bucket.start && expenseDate < bucket.end ? sum + expense.amount : sum;
    }, 0),
  })), [expenses, chartPeriod]);
  const chartMax = Math.max(1, ...chartData.map((bucket) => bucket.total));

  useEffect(() => {
    try {
      window.localStorage.setItem("expense-tracker-items", JSON.stringify(expenses));
    } catch {
      // Keep the tracker usable if the browser blocks local storage.
    }
  }, [expenses]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === "custom") {
      document.documentElement.style.setProperty("--accent", customColor);
      document.documentElement.style.setProperty("--accent-hover", blendHex(customColor, "#000000", 0.16));
      document.documentElement.style.setProperty("--focus", customColor);
      document.documentElement.style.setProperty("--soft", blendHex(customColor, "#ffffff", darkMode ? 0.83 : 0.91));
      document.documentElement.style.setProperty("--on-accent", contrastingTextColor(customColor));
    } else {
      ["--accent", "--accent-hover", "--focus", "--soft", "--on-accent"].forEach((property) => document.documentElement.style.removeProperty(property));
    }
    try {
      window.localStorage.setItem("expense-tracker-theme", theme);
      window.localStorage.setItem("expense-tracker-custom-color", customColor);
    } catch {
      // The selected theme still applies for this session if storage is unavailable.
    }
  }, [theme, customColor, darkMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem("expense-tracker-overview-pattern", overviewPattern);
    } catch {
      // Keep the selected pattern for this session if storage is unavailable.
    }
  }, [overviewPattern]);

  useEffect(() => {
    document.documentElement.dataset.mode = darkMode ? "dark" : "light";
    try {
      window.localStorage.setItem("expense-tracker-dark-mode", String(darkMode));
    } catch {
      // Keep dark mode active for this session if storage is unavailable.
    }
  }, [darkMode]);

  useEffect(() => {
    const refreshToday = () => {
      const now = new Date();
      setTodayKey(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
    };
    const timer = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileVisibleCount(6);
  }, [todayKey]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 780px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.category || !form.date) return;
    setExpenses((current) => [{ ...form, id: Date.now(), name: form.name.trim(), note: form.note.trim(), amount }, ...current]);
    setForm({ ...emptyForm, date: localDate });
  }

  function removeExpense(id) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
  }

  function exportExpenses() {
    const backup = { app: "expense-tracker", version: 1, exportedAt: new Date().toISOString(), expenses };
    downloadFile(JSON.stringify(backup, null, 2), `expense-tracker-${localDate}.json`, "application/json");
    setImportMessage("Your JSON expense backup has been downloaded.");
  }

  function exportCsv() {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Name", "Amount (INR)", "Category", "Note", "Date"],
      ...expenses.map(({ name, amount, category, note, date }) => [name, amount, category, note, date]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}`;
    downloadFile(csv, `expense-tracker-${localDate}.csv`, "text/csv;charset=utf-8");
    setImportMessage("Your CSV file has been downloaded and is ready to open in a spreadsheet.");
  }

  function downloadFile(contents, filename, type) {
    const file = new Blob([contents], { type });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importExpenses(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const imported = Array.isArray(data) ? data : data?.expenses;
      if (!Array.isArray(imported)) throw new Error("The file does not contain an expense list.");
      const valid = imported.every((item) =>
        item && typeof item.name === "string" && item.name.trim() &&
        Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
        categories.some((category) => category.name === item.category) &&
        typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        !Number.isNaN(new Date(`${item.date}T00:00:00`).getTime())
      );
      if (!valid) throw new Error("Some entries are invalid. Use a backup exported from this tracker.");
      setExpenses(imported.map((item, index) => ({
        id: Date.now() + index,
        name: item.name.trim().slice(0, 60),
        amount: Number(item.amount),
        category: item.category,
        note: typeof item.note === "string" ? item.note.trim().slice(0, 140) : "",
        date: item.date,
      })));
      setImportMessage(`Imported ${imported.length} ${imported.length === 1 ? "expense" : "expenses"}. This replaced the current list.`);
    } catch (error) {
      setImportMessage(error instanceof SyntaxError ? "Could not read that file. Choose a valid JSON backup." : error.message);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="app" data-theme={theme}>
      <header className="header">
        <div className="brand-mark" aria-hidden="true">₹</div>
        <div className="header-copy">
          <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
          <h1>Expense tracker</h1>
          <p>A little clarity for every rupee.</p>
        </div>
      </header>

      <section className="overview" data-pattern={overviewPattern} aria-label="Expense summary">
        <div className="overview-copy">
          <span className="eyebrow">TOTAL TRACKED</span>
          <h2>{currency.format(total)}</h2>
          <p>Across {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}</p>
        </div>
        <button
          className="overview-icon"
          type="button"
          aria-label="View recent expenses"
          onClick={() => document.getElementById("recent-expenses")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </section>

      <section className="tools-bar" aria-label="Appearance and data tools">
        <label className="theme-control" htmlFor="theme-choice">
          <span className="palette-icon" aria-hidden="true">◉</span>
          <span>Theme</span>
          <span className="select-wrap">
            <select id="theme-choice" value={theme} onChange={(event) => setTheme(event.target.value)}>
              {themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </span>
        </label>
        {theme === "custom" && (
          <label className="custom-color-control" htmlFor="custom-theme-color">
            <span>Pick a color</span>
            <input id="custom-theme-color" type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} />
          </label>
        )}
        <label className="theme-control pattern-control" htmlFor="overview-pattern">
          <span className="palette-icon" aria-hidden="true">▦</span>
          <span>Pattern</span>
          <span className="select-wrap">
            <select id="overview-pattern" value={overviewPattern} onChange={(event) => setOverviewPattern(event.target.value)}>
              {overviewPatterns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </span>
        </label>
        <button className="mode-toggle" type="button" aria-pressed={darkMode} onClick={() => setDarkMode((current) => !current)}>
          <span className="mode-switch" aria-hidden="true"><span /></span>
          <span>{darkMode ? "Dark mode on" : "Dark mode"}</span>
        </button>
        <div className="data-actions">
          <button className="utility-button" type="button" onClick={exportCsv}>↓ Export CSV</button>
          <button className="utility-button" type="button" onClick={exportExpenses}>↓ Export JSON</button>
          <button className="utility-button" type="button" onClick={() => importInput.current?.click()}>↑ Import backup</button>
          <input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importExpenses} aria-label="Choose expense backup JSON file" />
        </div>
        <p className="tools-message" role="status" aria-live="polite">{importMessage || "JSON import replaces your current list. Export a backup before importing if you want to keep it."}</p>
      </section>

      <div className="content-grid">
        <section className="panel add-panel">
          <div className="panel-heading">
            <div className="step-number">01</div>
            <div><h2>Add an expense</h2><p>Keep your spending up to date.</p></div>
          </div>
          <form className="form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="expense-name">What did you spend on?</label>
              <input id="expense-name" type="text" placeholder="e.g. Morning coffee" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={60} />
            </div>
            <div className="form-row">
              <div className="input-group">
                <label htmlFor="expense-amount">Amount</label>
                <div className="amount-field"><span>₹</span><input id="expense-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></div>
              </div>
              <div className="input-group">
                <label htmlFor="expense-date">Date</label>
                <input id="expense-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="expense-category">Category</label>
              <select id="expense-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required>
                <option value="" disabled>Choose a category</option>
                {categories.map((category) => <option key={category.name} value={category.name}>{category.icon} {category.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="expense-note">Note <span className="optional">OPTIONAL</span></label>
              <textarea id="expense-note" placeholder="Add a small detail…" rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength={140} />
            </div>
            <button className="add-button" type="submit"><span aria-hidden="true">＋</span> Add expense</button>
          </form>
        </section>

        <section className="panel list-panel" id="recent-expenses">
          <div className="panel-heading list-heading">
            <div className="step-number">02</div>
            <div><h2>Today's expenses</h2><p>Automatically refreshes each day.</p></div>
            <span className="expense-count">{todayExpenses.length} today</span>
          </div>
          {todayExpenses.length ? (
            <div className="expense-list">
              {todayExpenses.map((expense, index) => {
                const category = categories.find((item) => item.name === expense.category) || categories.at(-1);
                return (
                  <article className={`expense-card ${index >= mobileVisibleCount ? "mobile-collapsed" : ""}`} key={expense.id}>
                    <div className={`illustration ${category.color}`} aria-hidden="true">{category.icon}</div>
                    <div className="expense-info">
                      <div className="expense-top"><h3>{expense.name}</h3><strong>{currency.format(expense.amount)}</strong></div>
                      <div className="expense-meta"><span className={`category ${category.color}`}>{expense.category}</span><span className="date">{formatDate(expense.date)}</span></div>
                      {expense.note && <p className="note">{expense.note}</p>}
                    </div>
                    <button className="delete-button" type="button" onClick={() => removeExpense(expense.id)} aria-label={`Delete ${expense.name}`} title="Delete expense">×</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><span aria-hidden="true">🧾</span><h3>No expenses today</h3><p>Expenses added today will appear here.</p></div>
          )}
          {todayExpenses.length > 6 && (
            <div className="mobile-list-actions">
              {mobileVisibleCount < todayExpenses.length && <button type="button" onClick={() => setMobileVisibleCount((count) => Math.min(count + 5, todayExpenses.length))}>Show 5 more</button>}
              {mobileVisibleCount < todayExpenses.length && <button type="button" onClick={() => setMobileVisibleCount(todayExpenses.length)}>Show all</button>}
              {mobileVisibleCount > 6 && <button type="button" onClick={() => setMobileVisibleCount(6)}>Show less</button>}
            </div>
          )}
          <p className="list-footnote">
            <span className="mobile-footnote">Showing {Math.min(mobileVisibleCount, todayExpenses.length)} of {todayExpenses.length} today</span>
            <span className="desktop-footnote">{todayExpenses.length} {todayExpenses.length === 1 ? "expense" : "expenses"} today</span>
          </p>
        </section>
      </div>

      <section className="panel history-panel" aria-labelledby="history-title">
        <div
          className="history-toggle"
          role={isMobile ? "button" : undefined}
          tabIndex={isMobile ? 0 : -1}
          aria-controls="history-content"
          aria-expanded={isMobile ? historyOpen : undefined}
          onClick={() => { if (isMobile) setHistoryOpen((open) => !open); }}
          onKeyDown={(event) => {
            if (isMobile && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              setHistoryOpen((open) => !open);
            }
          }}
        >
          <div className="panel-heading list-heading">
            <div className="step-number">03</div>
            <div className="history-title-copy"><h2 id="history-title">Expense history</h2><p>All your expenses, newest first.</p></div>
            <span className="expense-count">{expenses.length} total</span>
            <span className={`history-chevron ${historyOpen ? "open" : ""}`} aria-hidden="true">↓</span>
          </div>
        </div>
        <div className={`history-content ${historyOpen ? "open" : ""}`} id="history-content">
          {sortedExpenses.length ? (
            <div className="history-list">
              {sortedExpenses.map((expense, index) => {
                const category = categories.find((item) => item.name === expense.category) || categories.at(-1);
                return (
                  <article className={`expense-card ${index >= historyVisibleCount ? "mobile-collapsed" : ""}`} key={`history-${expense.id}`}>
                    <div className={`illustration ${category.color}`} aria-hidden="true">{category.icon}</div>
                    <div className="expense-info">
                      <div className="expense-top"><h3>{expense.name}</h3><strong>{currency.format(expense.amount)}</strong></div>
                      <div className="expense-meta"><span className={`category ${category.color}`}>{expense.category}</span><span className="date">{formatDate(expense.date)}</span></div>
                      {expense.note && <p className="note">{expense.note}</p>}
                    </div>
                    <button className="delete-button" type="button" onClick={() => removeExpense(expense.id)} aria-label={`Delete ${expense.name}`} title="Delete expense">×</button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><span aria-hidden="true">🧾</span><h3>No expense history</h3><p>Add an expense and it will be saved here.</p></div>
          )}
          {sortedExpenses.length > 6 && (
            <div className="mobile-list-actions">
              {historyVisibleCount < sortedExpenses.length && <button type="button" onClick={() => setHistoryVisibleCount((count) => Math.min(count + 5, sortedExpenses.length))}>Show 5 more</button>}
              {historyVisibleCount < sortedExpenses.length && <button type="button" onClick={() => setHistoryVisibleCount(sortedExpenses.length)}>Show all</button>}
              {historyVisibleCount > 6 && <button type="button" onClick={() => setHistoryVisibleCount(6)}>Show less</button>}
            </div>
          )}
          <p className="list-footnote">
            <span className="mobile-footnote">Showing {Math.min(historyVisibleCount, expenses.length)} of {expenses.length} entries</span>
            <span className="desktop-footnote">Showing {expenses.length} {expenses.length === 1 ? "entry" : "entries"}</span>
          </p>
        </div>
      </section>

      <section className="panel chart-panel" aria-labelledby="chart-title">
        <div className="chart-heading">
          <div className="panel-heading">
            <div className="step-number">04</div>
            <div><h2 id="chart-title">Spending over time</h2><p>See how your expenses change by period.</p></div>
          </div>
          <div className="period-switch" role="group" aria-label="Chart time period">
            {chartPeriods.map((period) => (
              <button key={period.id} type="button" className={chartPeriod === period.id ? "active" : ""} aria-pressed={chartPeriod === period.id} onClick={() => setChartPeriod(period.id)}>
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-wrap">
          <svg className="spending-chart" viewBox="0 0 640 238" role="img" aria-label={`${chartPeriods.find((period) => period.id === chartPeriod)?.label} expense totals chart`}>
            {[0, 1, 2, 3, 4].map((tick) => {
              const y = 184 - tick * 40;
              return <g key={tick}><line className="chart-gridline" x1="55" x2="630" y1={y} y2={y} /><text className="chart-axis-label" x="47" y={y + 4} textAnchor="end">{new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format((chartMax / 4) * tick)}</text></g>;
            })}
            {chartData.map((bucket, index) => {
              const step = 575 / chartData.length;
              const width = Math.min(42, step * 0.52);
              const height = bucket.total ? Math.max(4, (bucket.total / chartMax) * 154) : 0;
              const x = 55 + step * index + (step - width) / 2;
              const y = 184 - height;
              return <g key={bucket.key}>
                <rect className={`chart-bar ${bucket.total ? "has-value" : ""}`} x={x} y={y} width={width} height={height} rx="7">
                  <title>{`${bucket.label}: ${currency.format(bucket.total)}`}</title>
                </rect>
                <text className="chart-x-label" x={x + width / 2} y="213" textAnchor="middle">{bucket.label}</text>
              </g>;
            })}
          </svg>
        </div>
        <p className="chart-caption">{chartData.reduce((sum, bucket) => sum + bucket.total, 0) > 0 ? `Showing ${chartPeriods.find((period) => period.id === chartPeriod)?.label.toLowerCase()} totals from your saved expenses.` : "No expenses in this period yet. Add an expense to see it in the chart."}</p>
      </section>
      <footer>Small steps make a big difference.</footer>
    </main>
  );
}

export default App;
