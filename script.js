const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");

const tasks = [];

function renderTasks() {
  taskList.innerHTML = "";
  emptyState.hidden = tasks.length > 0;

  tasks.forEach((task, index) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      renderTasks();
    });

    const text = document.createElement("span");
    text.textContent = task.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", () => {
      tasks.splice(index, 1);
      renderTasks();
    });

    item.append(checkbox, text, deleteButton);
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

  tasks.push({ title, completed: false });
  taskInput.value = "";
  renderTasks();
  taskInput.focus();
});

renderTasks();
