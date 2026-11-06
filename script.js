/**
 * Simple To-Do List Application
 * Features: LocalStorage persistence, Add, Edit, Confirm Delete, Search, Realtime Total Counter
 */

(() => {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'todo_app_tasks';

  // --- State ---
  let tasks = [];
  let searchQuery = '';
  let taskPendingDeletion = null;

  // --- DOM Elements ---
  const addTaskForm = document.getElementById('add-task-form');
  const taskTitleInput = document.getElementById('task-title');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskDescInput = document.getElementById('task-desc');

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const totalTasksCountEl = document.getElementById('total-tasks-count');

  const tasksContainer = document.getElementById('tasks-container');
  const emptyStateEl = document.getElementById('empty-state');
  const emptyStateTitle = document.getElementById('empty-state-title');
  const emptyStateDesc = document.getElementById('empty-state-desc');

  // Edit Modal Elements
  const editModal = document.getElementById('edit-modal');
  const editTaskForm = document.getElementById('edit-task-form');
  const editTaskIdInput = document.getElementById('edit-task-id');
  const editTaskTitleInput = document.getElementById('edit-task-title');
  const editTaskDueDateInput = document.getElementById('edit-task-due-date');
  const editTaskDescInput = document.getElementById('edit-task-desc');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Delete Modal Elements
  const deleteModal = document.getElementById('delete-modal');
  const deleteModalDesc = document.getElementById('delete-modal-desc');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // ==========================================================================
  // Storage Handlers
  // ==========================================================================

  /**
   * Load tasks from localStorage
   */
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      tasks = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(tasks)) {
        tasks = [];
      }
    } catch (e) {
      console.error('Failed to load tasks from localStorage:', e);
      tasks = [];
    }
  }

  /**
   * Save tasks to localStorage
   */
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage:', e);
    }
  }

  // ==========================================================================
  // Helper Utilities
  // ==========================================================================

  /**
   * Sanitize text string for safe HTML rendering
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format date into readable string and determine status
   */
  function formatDueDate(dueDateStr) {
    if (!dueDateStr) return null;

    // Parse YYYY-MM-DD
    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return null;

    const dueYear = parseInt(parts[0], 10);
    const dueMonth = parseInt(parts[1], 10) - 1;
    const dueDay = parseInt(parts[2], 10);

    const dueDate = new Date(dueYear, dueMonth, dueDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(dueDate);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let status = 'normal';
    let label = '';

    const formattedDateString = dueDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (diffDays < 0) {
      status = 'overdue';
      label = `Overdue (${formattedDateString})`;
    } else if (diffDays === 0) {
      status = 'today';
      label = `Due Today`;
    } else if (diffDays === 1) {
      status = 'upcoming';
      label = `Tomorrow (${formattedDateString})`;
    } else {
      status = 'normal';
      label = `Due: ${formattedDateString}`;
    }

    return { label, status };
  }

  // ==========================================================================
  // Render Functions
  // ==========================================================================

  /**
   * Main render function: updates counter, filter list, and renders items
   */
  function render() {
    // 1. Update total tasks count at the top
    totalTasksCountEl.textContent = tasks.length;

    // 2. Filter tasks based on search query
    const query = searchQuery.trim().toLowerCase();
    const filteredTasks = tasks.filter(task => {
      if (!query) return true;
      const titleMatch = (task.title || '').toLowerCase().includes(query);
      const descMatch = (task.description || '').toLowerCase().includes(query);
      return titleMatch || descMatch;
    });

    // 3. Clear container
    tasksContainer.innerHTML = '';

    // 4. Handle empty states
    if (tasks.length === 0) {
      // Entirely empty list
      tasksContainer.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
      emptyStateTitle.textContent = 'No tasks yet! ✨';
      emptyStateDesc.textContent = 'Add your first task above to start organizing your day.';
      return;
    }

    if (filteredTasks.length === 0) {
      // No tasks match current search filter
      tasksContainer.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
      emptyStateTitle.textContent = 'No matching tasks';
      emptyStateDesc.textContent = `No tasks found matching "${searchQuery}". Try a different search.`;
      return;
    }

    // List has items to show
    emptyStateEl.classList.add('hidden');
    tasksContainer.classList.remove('hidden');

    // 5. Render task cards
    filteredTasks.forEach(task => {
      const taskCard = document.createElement('article');
      taskCard.className = `task-item ${task.completed ? 'is-completed' : ''}`;
      taskCard.setAttribute('data-id', task.id);
      taskCard.setAttribute('role', 'listitem');

      // Date badge markup
      let dateBadgeHTML = '';
      if (task.dueDate) {
        const dateInfo = formatDueDate(task.dueDate);
        if (dateInfo) {
          dateBadgeHTML = `
            <span class="due-badge ${dateInfo.status}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              ${escapeHTML(dateInfo.label)}
            </span>
          `;
        }
      }

      // Description markup
      let descHTML = '';
      if (task.description && task.description.trim()) {
        descHTML = `<div class="task-desc">${escapeHTML(task.description)}</div>`;
      }

      taskCard.innerHTML = `
        <div class="task-top-row">
          <div class="task-main-info">
            <div class="task-checkbox-wrap">
              <input 
                type="checkbox" 
                class="task-checkbox" 
                data-id="${task.id}" 
                aria-label="Mark task as complete"
                ${task.completed ? 'checked' : ''}
              />
            </div>
            <div class="task-title-group">
              <h3 class="task-title">${escapeHTML(task.title)}</h3>
              ${descHTML}
            </div>
          </div>
        </div>

        <div class="task-footer-row">
          <div class="task-date-area">
            ${dateBadgeHTML}
          </div>
          <div class="task-actions">
            <button type="button" class="btn-icon btn-edit" data-id="${task.id}" aria-label="Edit task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn-icon btn-delete" data-id="${task.id}" aria-label="Delete task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      `;

      tasksContainer.appendChild(taskCard);
    });
  }

  // ==========================================================================
  // Task Operations (Create, Update, Delete, Toggle)
  // ==========================================================================

  /**
   * Add a new task
   */
  function handleAddTask(e) {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    if (!title) {
      taskTitleInput.focus();
      return;
    }

    const dueDate = taskDueDateInput.value;
    const description = taskDescInput.value.trim();

    const newTask = {
      id: Date.now().toString(),
      title,
      dueDate: dueDate || '',
      description: description || '',
      completed: false,
      createdAt: new Date().toISOString()
    };

    // Add to state and save
    tasks.unshift(newTask);
    saveTasks();

    // Reset form
    addTaskForm.reset();

    // Clear search filter so newly created task is visible
    if (searchQuery) {
      searchQuery = '';
      searchInput.value = '';
      clearSearchBtn.classList.add('hidden');
    }

    render();
  }

  /**
   * Toggle task completed status
   */
  function handleToggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      render();
    }
  }

  /**
   * Open Edit modal with task data
   */
  function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editTaskIdInput.value = task.id;
    editTaskTitleInput.value = task.title;
    editTaskDueDateInput.value = task.dueDate || '';
    editTaskDescInput.value = task.description || '';

    editModal.classList.remove('hidden');
    editTaskTitleInput.focus();
  }

  /**
   * Close Edit modal
   */
  function closeEditModal() {
    editModal.classList.add('hidden');
    editTaskForm.reset();
  }

  /**
   * Handle Edit task form submission
   */
  function handleEditTaskSubmit(e) {
    e.preventDefault();

    const id = editTaskIdInput.value;
    const title = editTaskTitleInput.value.trim();
    if (!title) {
      editTaskTitleInput.focus();
      return;
    }

    const dueDate = editTaskDueDateInput.value;
    const description = editTaskDescInput.value.trim();

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].title = title;
      tasks[taskIndex].dueDate = dueDate || '';
      tasks[taskIndex].description = description || '';

      saveTasks();
      render();
    }

    closeEditModal();
  }

  /**
   * Open Delete confirmation modal
   */
  function openDeleteModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    taskPendingDeletion = task;
    deleteModalDesc.innerHTML = `Are you sure you want to delete "<strong>${escapeHTML(task.title)}</strong>"? This action cannot be undone.`;
    deleteModal.classList.remove('hidden');
    confirmDeleteBtn.focus();
  }

  /**
   * Close Delete confirmation modal
   */
  function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    taskPendingDeletion = null;
  }

  /**
   * Confirm deletion
   */
  function handleConfirmDelete() {
    if (!taskPendingDeletion) return;

    tasks = tasks.filter(t => t.id !== taskPendingDeletion.id);
    saveTasks();
    closeDeleteModal();
    render();
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  // Add Task
  addTaskForm.addEventListener('submit', handleAddTask);

  // Edit Task
  editTaskForm.addEventListener('submit', handleEditTaskSubmit);
  cancelEditBtn.addEventListener('click', closeEditModal);
  closeEditModalBtn.addEventListener('click', closeEditModal);

  // Delete Task
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  // Click outside modal content to close
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Global Escape key to dismiss modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!editModal.classList.contains('hidden')) {
        closeEditModal();
      }
      if (!deleteModal.classList.contains('hidden')) {
        closeDeleteModal();
      }
    }
  });

  // Task list delegated click events (checkbox, edit, delete)
  tasksContainer.addEventListener('click', (e) => {
    const target = e.target;

    // Checkbox toggle
    if (target.matches('.task-checkbox')) {
      const id = target.getAttribute('data-id');
      handleToggleComplete(id);
      return;
    }

    // Edit button
    const editBtn = target.closest('.btn-edit');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      openEditModal(id);
      return;
    }

    // Delete button
    const deleteBtn = target.closest('.btn-delete');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      openDeleteModal(id);
      return;
    }
  });

  // Search input events
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.trim().length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    render();
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================
  loadTasks();
  render();

})();

