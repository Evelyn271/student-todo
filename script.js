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
const greetingEl = document.querySelector("#greeting");
const todayDateEl = document.querySelector("#today-date");
const dailyQuoteEl = document.querySelector("#daily-quote");

let tasks = loadTasks();
let currentFilter = "all";
let currentCategory = "all";
let searchKeyword = "";
let currentSort = "created";

const ringCircumference = 2 * Math.PI * 52;

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

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((task) => task.completed).length;
  const active = total - done;
  const overdue = tasks.filter(isOverdue).length;

  statTotal.textContent = total;
  statDone.textContent = done;
  statActive.textContent = active;
  statOverdue.textContent = overdue;

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  progressPercent.textContent = `${percent}%`;
  const offset = ringCircumference * (1 - percent / 100);
  progressRingFill.style.strokeDashoffset = offset;
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
  emptyState.hidden = visibleTasks.length > 0;
  emptyState.textContent = tasks.length === 0
    ? "暂时没有任务，添加一个今天的学习目标吧。"
    : "没有符合当前条件的任务。";
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
      task.completed = checkbox.checked;
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
    dueDate: dueDateValue,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  taskInput.value = "";
  dueDateInput.value = "";
  prioritySelect.value = "medium";
  categorySelect.value = "general";
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

initTheme();

