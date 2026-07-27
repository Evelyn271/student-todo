const storageKey = "student-todo-tasks-v2";
const quotes = [
  "每天进步一点点，就是最好的学习节奏。",
  "把大目标拆成小任务，一步步走就会到达。",
  "今天不想学，所以才要学——这是成长的开始。",
  "专注一小时，胜过拖延一整天。",
  "不积跬步，无以至千里；不积小流，无以成江海。",
  "慢慢来，比较快。"
];
const categoryNames = {
  general: "通用",
  programming: "编程",
  math: "数学",
  english: "英语",
  reading: "阅读",
  other: "其他"
};
const priorityRank = { high: 3, medium: 2, low: 1 };

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categorySelect = document.querySelector("#category-select");
const prioritySelect = document.querySelector("#priority-select");
const dueDateInput = document.querySelector("#due-date");
const recurrenceSelect = document.querySelector("#recurrence-select");
const timerDisplay = document.querySelector("#timer-display");
const timerPhase = document.querySelector("#timer-phase");
const timerToggle = document.querySelector("#timer-toggle");
const timerReset = document.querySelector("#timer-reset");
const timerSkip = document.querySelector("#timer-skip");
const timerCount = document.querySelector("#timer-count");
const timerRingFill = document.querySelector("#timer-ring-fill");
const timerCard = document.querySelector(".timer-card");
const settingsToggle = document.querySelector("#settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const exportJsonButton = document.querySelector("#export-json");
const exportCsvButton = document.querySelector("#export-csv");
const importJsonInput = document.querySelector("#import-json");
const clearAllButton = document.querySelector("#clear-all");
const settingsStatus = document.querySelector("#settings-status");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const filterButtons = document.querySelectorAll(".filter-button");
const categoryChips = document.querySelector("#category-chips");
const clearCompletedButton = document.querySelector("#clear-completed");
const taskCount = document.querySelector("#task-count");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const progressRingFill = document.querySelector("#progress-ring__fill");
const progressPercent = document.querySelector("#progress-percent");
const statTotal = document.querySelector("#stat-total");
const statDone = document.querySelector("#stat-done");
const statActive = document.querySelector("#stat-active");
const statOverdue = document.querySelector("#stat-overdue");
const greetingEl = document.querySelector("#greeting-text");
const todayDateEl = document.querySelector("#today-date");
const dailyQuoteEl = document.querySelector("#daily-quote-text");

let tasks = loadTasks();
let currentFilter = "all";
let currentCategory = "all";
let searchKeyword = "";
let currentSort = "created";

const ringCircumference = 2 * Math.PI * 58;
const timerRingCircumference = 2 * Math.PI * 54;
const POMODORO_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

let timerState = {
  phase: "focus",
  remaining: POMODORO_DURATION,
  running: false,
  intervalId: null,
  pomodoroCount: 0
};

function createTaskId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  return startOfDay(new Date()) > startOfDay(task.dueDate);
}

function formatDueDate(dueDate) {
  if (!dueDate) return "";
  const today = startOfDay(new Date());
  const target = startOfDay(dueDate);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天截止";
  if (diffDays === 1) return "明天截止";
  if (diffDays === -1) return "昨天截止";
  if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
  if (diffDays <= 7) return `${diffDays} 天后`;

  return `${dueDate.getMonth() + 1} 月 ${dueDate.getDate()} 日`;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((task) => ({
        id: task.id || createTaskId(),
        title: String(task.title || ""),
        completed: Boolean(task.completed),
        priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
        category: categoryNames[task.category] ? task.category : "general",
        recurrence: ["none", "daily", "weekly", "monthly"].includes(task.recurrence) ? task.recurrence : "none",
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        createdAt: task.createdAt || new Date().toISOString()
      }))
      .filter((task) => task.title);
  } catch (error) {
    console.error("读取任务失败：", error);
    return [];
  }
}

function saveTasks() {
  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
    category: task.category,
    recurrence: task.recurrence,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt
  }));
  localStorage.setItem(storageKey, JSON.stringify(serialized));
}

function getVisibleTasks() {
  const normalizedKeyword = searchKeyword.toLowerCase();

  return tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(normalizedKeyword);
    const matchesCategory = currentCategory === "all" || task.category === currentCategory;
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed) ||
      (currentFilter === "overdue" && isOverdue(task));

    return matchesSearch && matchesCategory && matchesFilter;
  });
}

function sortTasks(list) {
  const sorted = [...list];

  sorted.sort((a, b) => {
    if (currentSort === "due") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    }
    if (currentSort === "priority") {
      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    }
    if (currentSort === "title") {
      return a.title.localeCompare(b.title, "zh-CN");
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return sorted;
}

function animateNumber(element, targetValue) {
  const current = Number(element.dataset.value || 0);
  if (current === targetValue) {
    element.textContent = targetValue;
    return;
  }

  const startTime = performance.now();
  const duration = 480;
  const startValue = current;

  element.classList.add("bump");
  setTimeout(() => element.classList.remove("bump"), 520);

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(startValue + (targetValue - startValue) * eased);
    element.textContent = value;
    element.dataset.value = String(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

let lastProgressPercent = -1;

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((task) => task.completed).length;
  const active = total - done;
  const overdue = tasks.filter(isOverdue).length;

  animateNumber(statTotal, total);
  animateNumber(statDone, done);
  animateNumber(statActive, active);
  animateNumber(statOverdue, overdue);

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  progressPercent.textContent = `${percent}%`;
  const offset = ringCircumference * (1 - percent / 100);
  progressRingFill.style.strokeDashoffset = offset;

  const progressCard = document.querySelector(".progress-card");
  if (progressCard && lastProgressPercent !== -1 && percent > lastProgressPercent) {
    progressCard.classList.add("update-pulse");
    if (percent === 100 && lastProgressPercent < 100) {
      progressCard.classList.add("complete");
    }
    setTimeout(() => progressCard.classList.remove("update-pulse", "complete"), 800);
  }
  lastProgressPercent = percent;
}

function renderCategoryChips() {
  categoryChips.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `category-chip${currentCategory === "all" ? " active" : ""}`;
  allChip.textContent = "全部学科";
  allChip.addEventListener("click", () => {
    currentCategory = "all";
    renderCategoryChips();
    renderTasks();
  });
  categoryChips.append(allChip);

  Object.entries(categoryNames).forEach(([key, name]) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `category-chip${currentCategory === key ? " active" : ""}`;
    chip.textContent = name;
    chip.addEventListener("click", () => {
      currentCategory = currentCategory === key ? "all" : key;
      renderCategoryChips();
      renderTasks();
    });
    categoryChips.append(chip);
  });
}

function renderTasks() {
  renderStats();

  const visibleTasks = sortTasks(getVisibleTasks());
  const completedCount = tasks.filter((task) => task.completed).length;

  taskList.innerHTML = "";
  const emptyText = document.querySelector("#empty-state-text");
  if (emptyText) {
    emptyText.textContent = tasks.length === 0
      ? "暂时没有任务，添加一个今天的学习目标吧。"
      : "没有符合当前条件的任务。";
  }
  emptyState.hidden = visibleTasks.length > 0;
  taskCount.textContent = `共 ${tasks.length} 项，已完成 ${completedCount} 项`;
  clearCompletedButton.disabled = completedCount === 0;

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    const overdue = isOverdue(task);
    item.className = `task-item${task.completed ? " completed" : ""}${overdue ? " overdue" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `标记“${task.title}”完成`);
    checkbox.addEventListener("change", () => {
      const wasCompleted = task.completed;
      task.completed = checkbox.checked;
      if (!wasCompleted && task.completed) {
        triggerCelebration(item);
        if (task.recurrence && task.recurrence !== "none") {
          scheduleRecurrence(task);
        }
      }
      saveTasks();
      renderTasks();
    });

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const categoryTag = document.createElement("span");
    categoryTag.className = "tag tag-category";
    categoryTag.textContent = categoryNames[task.category] || "通用";
    meta.append(categoryTag);

    const priorityTag = document.createElement("span");
    priorityTag.className = `tag tag-priority-${task.priority}`;
    priorityTag.textContent = `${({ low: "低", medium: "中", high: "高" })[task.priority]}优先级`;
    meta.append(priorityTag);

    if (task.dueDate) {
      const dueTag = document.createElement("span");
      const dueOverdue = overdue;
      dueTag.className = `tag${dueOverdue ? " tag-due-overdue" : " tag-due"}`;
      dueTag.textContent = `📅 ${formatDueDate(task.dueDate)}`;
      meta.append(dueTag);
    }

    if (task.recurrence && task.recurrence !== "none") {
      const recurTag = document.createElement("span");
      recurTag.className = "tag tag-recurring";
      const labels = { daily: "🔁 每天", weekly: "🔁 每周", monthly: "🔁 每月" };
      recurTag.textContent = labels[task.recurrence] || "🔁 重复";
      meta.append(recurTag);
    }

    content.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.title = "编辑";
    editButton.textContent = "✎";
    editButton.addEventListener("click", () => editTask(task));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button danger";
    deleteButton.title = "删除";
    deleteButton.textContent = "✕";
    deleteButton.addEventListener("click", () => deleteTask(task));

    actions.append(editButton, deleteButton);

    item.append(checkbox, content, actions);
    taskList.append(item);
  });
}

function editTask(task) {
  const newTitle = window.prompt("请输入新的任务内容：", task.title);
  if (newTitle === null) return;

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    window.alert("任务内容不能为空。");
    return;
  }

  task.title = trimmedTitle;
  saveTasks();
  renderTasks();
}

function deleteTask(task) {
  if (!window.confirm(`确定删除“${task.title}”吗？`)) return;

  tasks = tasks.filter((current) => current.id !== task.id);
  saveTasks();
  renderTasks();
}

function setupHeader() {
  const hour = new Date().getHours();
  let greeting = "你好";
  if (hour < 6) greeting = "夜深了，记得休息";
  else if (hour < 11) greeting = "早上好，新的一天";
  else if (hour < 14) greeting = "中午好，保持专注";
  else if (hour < 18) greeting = "下午好，继续加油";
  else if (hour < 22) greeting = "晚上好，辛苦了";
  else greeting = "夜深了，记得早点休息";

  greetingEl.textContent = greeting;

  const date = new Date();
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  todayDateEl.textContent = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 星期${weekday}`;

  dailyQuoteEl.textContent = quotes[date.getDate() % quotes.length];
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  const dueDateValue = dueDateInput.value ? new Date(dueDateInput.value) : null;

  tasks.push({
    id: createTaskId(),
    title,
    completed: false,
    priority: prioritySelect.value,
    category: categorySelect.value,
    recurrence: recurrenceSelect.value,
    dueDate: dueDateValue,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  taskInput.value = "";
  dueDateInput.value = "";
  prioritySelect.value = "medium";
  categorySelect.value = "general";
  recurrenceSelect.value = "none";
  renderTasks();
  taskInput.focus();
});

searchInput.addEventListener("input", () => {
  searchKeyword = searchInput.value.trim();
  renderTasks();
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  renderTasks();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((current) => {
      current.classList.toggle("active", current === button);
    });
    renderTasks();
  });
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (completedCount === 0 || !window.confirm(`确定清除 ${completedCount} 个已完成任务吗？`)) return;

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

if (progressRingFill) {
  progressRingFill.style.strokeDasharray = ringCircumference;
  progressRingFill.style.strokeDashoffset = ringCircumference;
}

setupHeader();
renderCategoryChips();
renderTasks();
bindSettingsPanel();
bindTimerControls();

// ========== 主题管理 ==========
const themeStorageKey = "student-todo-theme";
const themeToggle = document.querySelector("#theme-toggle");

function getStoredTheme() {
  return localStorage.getItem(themeStorageKey);
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(themeStorageKey, theme);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  }
}

function initTheme() {
  const stored = getStoredTheme();
  applyTheme(stored || getSystemTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? "dark" : "light");
    }
  });
}
// ========== 番茄钟 ==========
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function renderTimer() {
  if (timerDisplay) timerDisplay.textContent = formatTime(timerState.remaining);

  if (timerPhase) {
    timerPhase.textContent = timerState.phase === "focus" ? "专注" : "休息";
    timerPhase.classList.toggle("is-break", timerState.phase === "break");
  }

  if (timerCard) {
    timerCard.classList.toggle("is-break", timerState.phase === "break");
  }

  if (timerToggle) {
    timerToggle.textContent = timerState.running ? "暂停" : "继续";
  }

  if (timerCount) {
    timerCount.textContent = String(timerState.pomodoroCount);
  }

  const total = timerState.phase === "focus" ? POMODORO_DURATION : BREAK_DURATION;
  const progress = 1 - timerState.remaining / total;
  if (timerRingFill) {
    timerRingFill.style.strokeDashoffset = timerRingCircumference * (1 - progress);
  }
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  renderTimer();
  timerState.intervalId = setInterval(() => {
    timerState.remaining -= 1;
    if (timerState.remaining <= 0) {
      timerState.remaining = 0;
      finishPhase();
      return;
    }
    renderTimer();
  }, 1000);
}

function pauseTimer() {
  timerState.running = false;
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  timerState.phase = "focus";
  timerState.remaining = POMODORO_DURATION;
  renderTimer();
}

function skipPhase() {
  pauseTimer();
  finishPhase({ skip: true });
}

function finishPhase(options = {}) {
  pauseTimer();
  if (timerState.phase === "focus" && !options.skip) {
    timerState.pomodoroCount += 1;
    sendNotification("🍅 番茄完成！", "休息 5 分钟，然后继续。");
  } else if (timerState.phase === "break" && !options.skip) {
    sendNotification("⏰ 休息结束", "准备好开始下一个番茄吧！");
  }
  timerState.phase = timerState.phase === "focus" ? "break" : "focus";
  timerState.remaining = timerState.phase === "focus" ? POMODORO_DURATION : BREAK_DURATION;
  renderTimer();
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, silent: false });
    } catch (error) {
      console.warn("通知发送失败：", error);
    }
  }
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// ========== 重复任务 ==========
function scheduleRecurrence(task) {
  const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
  let nextDue = null;

  if (task.recurrence === "daily") {
    nextDue = new Date(baseDate);
    nextDue.setDate(nextDue.getDate() + 1);
  } else if (task.recurrence === "weekly") {
    nextDue = new Date(baseDate);
    nextDue.setDate(nextDue.getDate() + 7);
  } else if (task.recurrence === "monthly") {
    nextDue = new Date(baseDate);
    nextDue.setMonth(nextDue.getMonth() + 1);
  }

  tasks.push({
    id: createTaskId(),
    title: task.title,
    completed: false,
    priority: task.priority,
    category: task.category,
    recurrence: task.recurrence,
    dueDate: nextDue,
    createdAt: new Date().toISOString()
  });
}

// ========== 数据导入导出 ==========
function setSettingsStatus(message, type) {
  if (!settingsStatus) return;
  settingsStatus.textContent = message;
  settingsStatus.classList.remove("success", "error");
  if (type) settingsStatus.classList.add(type);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportAsJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed: task.completed,
      priority: task.priority,
      category: task.category,
      recurrence: task.recurrence,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt
    }))
  };

  downloadFile(`student-todo-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  setSettingsStatus(`已导出 ${tasks.length} 条任务。`, "success");
}

function exportAsCsv() {
  const headers = ["标题", "状态", "优先级", "学科", "重复", "截止日期", "创建时间"];
  const escapeCell = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
  };

  const rows = tasks.map((task) => [
    task.title,
    task.completed ? "已完成" : "未完成",
    { low: "低", medium: "中", high: "高" }[task.priority] || "中",
    categoryNames[task.category] || "通用",
    { none: "不重复", daily: "每天", weekly: "每周", monthly: "每月" }[task.recurrence] || "不重复",
    task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    task.createdAt ? task.createdAt.slice(0, 10) : ""
  ]);

  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  downloadFile(`student-todo-${Date.now()}.csv`, "\uFEFF" + content, "text/csv;charset=utf-8");
  setSettingsStatus(`已导出 ${tasks.length} 条任务为 CSV。`, "success");
}

function importFromJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed.tasks) ? parsed.tasks : null;

      if (!incoming) {
        setSettingsStatus("文件格式不正确。", "error");
        return;
      }

      const confirmed = window.confirm(`检测到 ${incoming.length} 条任务，是否覆盖当前数据？\n\n确定 = 覆盖，取消 = 追加。`);
      if (confirmed) {
        tasks.length = 0;
      }

      incoming.forEach((entry) => {
        if (!entry || !entry.title) return;
        tasks.push({
          id: entry.id || createTaskId(),
          title: String(entry.title),
          completed: Boolean(entry.completed),
          priority: ["low", "medium", "high"].includes(entry.priority) ? entry.priority : "medium",
          category: categoryNames[entry.category] ? entry.category : "general",
          recurrence: ["none", "daily", "weekly", "monthly"].includes(entry.recurrence) ? entry.recurrence : "none",
          dueDate: entry.dueDate ? new Date(entry.dueDate) : null,
          createdAt: entry.createdAt || new Date().toISOString()
        });
      });

      saveTasks();
      renderTasks();
      setSettingsStatus(`成功导入 ${incoming.length} 条任务。`, "success");
    } catch (error) {
      console.error(error);
      setSettingsStatus("文件解析失败：不是有效的 JSON。", "error");
    }
  };
  reader.readAsText(file, "utf-8");
}

function clearAllTasks() {
  if (!window.confirm("确定清空所有任务吗？此操作无法撤销。")) return;
  tasks = [];
  saveTasks();
  renderTasks();
  setSettingsStatus("已清空所有任务。", "success");
}

function bindSettingsPanel() {
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener("click", () => {
      settingsPanel.hidden = !settingsPanel.hidden;
      if (!settingsPanel.hidden) setSettingsStatus("");
    });
  }
  if (exportJsonButton) exportJsonButton.addEventListener("click", exportAsJson);
  if (exportCsvButton) exportCsvButton.addEventListener("click", exportAsCsv);
  if (importJsonInput) importJsonInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importFromJson(file);
    event.target.value = "";
  });
  if (clearAllButton) clearAllButton.addEventListener("click", clearAllTasks);
}

function bindTimerControls() {
  if (timerToggle) {
    timerToggle.addEventListener("click", () => {
      requestNotificationPermission();
      if (timerState.running) pauseTimer();
      else startTimer();
    });
  }
  if (timerReset) timerReset.addEventListener("click", resetTimer);
  if (timerSkip) timerSkip.addEventListener("click", skipPhase);

  if (timerRingFill) {
    timerRingFill.style.strokeDasharray = timerRingCircumference;
  }

  renderTimer();
}

initTheme();
// ========== 完成庆祝动效 ==========
const confettiContainer = document.querySelector("#confetti-container");
const confettiColors = ["#38bdf8", "#6366f1", "#a855f7", "#fb923c", "#10b981", "#f59e0b"];

function triggerCelebration(item) {
  if (!confettiContainer || !item) return;

  item.classList.add("celebrate");
  setTimeout(() => item.classList.remove("celebrate"), 600);

  const rect = item.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  for (let i = 0; i < 18; i += 1) {
    spawnConfetti(originX, originY);
  }
}

function spawnConfetti(x, y) {
  const piece = document.createElement("span");
  piece.className = "confetti";
  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
  piece.style.transform = `translate(0, 0) rotate(${Math.random() * 360}deg)`;

  const drift = (Math.random() - 0.5) * 220;
  piece.style.setProperty("--drift", `${drift}px`);
  piece.animate(
    [
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${drift}px, 220px) rotate(${Math.random() * 540 + 180}deg)`, opacity: 0 }
    ],
    {
      duration: 900 + Math.random() * 400,
      easing: "cubic-bezier(0.3, 0.6, 0.4, 1)"
    }
  );

  confettiContainer.append(piece);
  setTimeout(() => piece.remove(), 1500);
}











