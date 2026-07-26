const storageKey = "student-todo-tasks";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const prioritySelect = document.querySelector("#priority-select");
const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll(".filter-button");
const clearCompletedButton = document.querySelector("#clear-completed");
const taskCount = document.querySelector("#task-count");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");

let tasks = loadTasks();
let currentFilter = "all";
let searchKeyword = "";

function createTaskId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(storageKey);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks
      .map((task) => ({
        id: task.id || createTaskId(),
        title: String(task.title || ""),
        completed: Boolean(task.completed),
        priority: ["low", "medium", "high"].includes(task.priority)
          ? task.priority
          : "medium"
      }))
      .filter((task) => task.title);
  } catch (error) {
    console.error("读取任务失败：", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function getVisibleTasks() {
  const normalizedKeyword = searchKeyword.toLowerCase();

  return tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(normalizedKeyword);
    const matchesFilter = currentFilter === "all"
      || (currentFilter === "active" && !task.completed)
      || (currentFilter === "completed" && task.completed);

    return matchesSearch && matchesFilter;
  });
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
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
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
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

    const priority = document.createElement("small");
    priority.className = `priority priority-${task.priority}`;
    priority.textContent = `${{ low: "低", medium: "中", high: "高" }[task.priority]}优先级`;
    content.append(title, priority);

    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.textContent = "编辑";
    editButton.addEventListener("click", () => {
      const newTitle = window.prompt("请输入新的任务内容：", task.title);

      if (newTitle === null) {
        return;
      }

      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) {
        window.alert("任务内容不能为空。");
        return;
      }

      task.title = trimmedTitle;
      saveTasks();
      renderTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => {
      if (!window.confirm(`确定删除“${task.title}”吗？`)) {
        return;
      }

      tasks = tasks.filter((currentTask) => currentTask.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(checkbox, content, editButton, deleteButton);
    taskList.append(item);
  });
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.push({
    id: createTaskId(),
    title,
    completed: false,
    priority: prioritySelect.value
  });
  saveTasks();
  taskInput.value = "";
  prioritySelect.value = "medium";
  renderTasks();
  taskInput.focus();
});

searchInput.addEventListener("input", () => {
  searchKeyword = searchInput.value.trim();
  renderTasks();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((currentButton) => {
      currentButton.classList.toggle("active", currentButton === button);
    });
    renderTasks();
  });
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.completed).length;

  if (completedCount === 0 || !window.confirm(`确定清除 ${completedCount} 个已完成任务吗？`)) {
    return;
  }

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

renderTasks();
