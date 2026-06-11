// client-side local database store using localStorage

const STORAGE_KEY = 'vercel-todo-db';
const THEME_KEY = 'vercel-todo-theme';
const TIMER_KEY = 'vercel-todo-timer-state';

// Default starter tasks to populate the app on first visit
const DEFAULT_TASKS = [
  {
    id: '1',
    title: 'Review the Vercel-inspired DESIGN.md rules.',
    notes: 'Pay close attention to spacing, font hierarchy, and color system variables.',
    priority: 'high',
    category: 'Work',
    dueDate: new Date().toISOString().split('T')[0], // Today
    completed: true,
    subtasks: [
      { id: '1-1', title: 'Verify custom typography tokens', completed: true },
      { id: '1-2', title: 'Inspect stacked shadow parameters', completed: true },
      { id: '1-3', title: 'Confirm mesh gradient coordinates', completed: true }
    ],
    focusSeconds: 1500, // 25 minutes
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
    completedAt: Date.now() - 86400000
  },
  {
    id: '2',
    title: 'Configure Tailwind CSS v4 in astro.config.mjs.',
    notes: 'Verify dependencies are installed properly and Vite plugin is registered.',
    priority: 'high',
    category: 'Work',
    dueDate: new Date().toISOString().split('T')[0], // Today
    completed: false,
    subtasks: [
      { id: '2-1', title: 'Install tailwindcss and @tailwindcss/vite', completed: true },
      { id: '2-2', title: 'Reference style directives in global.css', completed: false }
    ],
    focusSeconds: 900, // 15 mins
    createdAt: Date.now() - 86400000
  },
  {
    id: '3',
    title: 'Design interactive Command Palette (⌘K Menu).',
    notes: 'Must support fuzzy search, tag query filters (e.g. tag:Work), and natural command parsing (e.g. /add Buy milk !high).',
    priority: 'medium',
    category: 'Personal',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    completed: false,
    subtasks: [
      { id: '3-1', title: 'Listen for keyboard shortcut triggers', completed: true },
      { id: '3-2', title: 'Build command parsing engine', completed: false },
      { id: '3-3', title: 'Write focus trapping for accessibility', completed: false }
    ],
    focusSeconds: 0,
    createdAt: Date.now()
  },
  {
    id: '4',
    title: 'Conduct user validation and manual testing.',
    notes: 'Run tests on dark and light mode. Verify accessibility aria-labels on icon buttons.',
    priority: 'low',
    category: 'Personal',
    dueDate: '',
    completed: false,
    subtasks: [],
    focusSeconds: 0,
    createdAt: Date.now()
  }
];

export const TodoStore = {
  // Read tasks from storage or load defaults
  getTodos() {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TASKS));
      return DEFAULT_TASKS;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored todos, resetting to empty list', e);
      return [];
    }
  },

  // Save tasks and trigger update event
  _save(todos) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    window.dispatchEvent(new CustomEvent('todo:change'));
  },

  addTodo(data) {
    const todos = this.getTodos();
    const newTodo = {
      id: Math.random().toString(36).substring(2, 9),
      title: data.title || 'Untitled Task',
      notes: data.notes || '',
      priority: data.priority || 'medium',
      category: data.category || 'Work',
      dueDate: data.dueDate || '',
      completed: false,
      subtasks: data.subtasks || [],
      focusSeconds: 0,
      createdAt: Date.now()
    };
    todos.unshift(newTodo);
    this._save(todos);
    return newTodo;
  },

  updateTodo(id, fields) {
    const todos = this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index] = { ...todos[index], ...fields };
      this._save(todos);
    }
  },

  deleteTodo(id) {
    const todos = this.getTodos();
    const filtered = todos.filter(t => t.id !== id);
    this._save(filtered);

    // If deleting the active Pomodoro todo, clear it
    const activeId = this.getActiveFocusTodoId();
    if (activeId === id) {
      this.setActiveFocusTodoId(null);
    }
  },

  toggleTodo(id) {
    const todos = this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      const todo = todos[index];
      todo.completed = !todo.completed;
      todo.completedAt = todo.completed ? Date.now() : null;
      
      // If completed, automatically mark all subtasks complete as well
      if (todo.completed && todo.subtasks) {
        todo.subtasks.forEach(sub => sub.completed = true);
      }
      
      this._save(todos);
    }
  },

  // Subtasks checklist actions
  addSubtask(todoId, subtaskTitle) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo) {
      if (!todo.subtasks) todo.subtasks = [];
      const newSub = {
        id: `${todoId}-${Math.random().toString(36).substring(2, 5)}`,
        title: subtaskTitle,
        completed: false
      };
      todo.subtasks.push(newSub);
      // Uncheck parent if adding new incomplete item
      todo.completed = false;
      todo.completedAt = null;
      this._save(todos);
    }
  },

  toggleSubtask(todoId, subtaskId) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      const sub = todo.subtasks.find(s => s.id === subtaskId);
      if (sub) {
        sub.completed = !sub.completed;
        
        // If all subtasks are complete, check the parent, otherwise uncheck it if all were completed before
        const allCompleted = todo.subtasks.every(s => s.completed);
        if (allCompleted) {
          todo.completed = true;
          todo.completedAt = Date.now();
        } else {
          todo.completed = false;
          todo.completedAt = null;
        }
        
        this._save(todos);
      }
    }
  },

  deleteSubtask(todoId, subtaskId) {
    const todos = this.getTodos();
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.subtasks) {
      todo.subtasks = todo.subtasks.filter(s => s.id !== subtaskId);
      
      // Re-evaluate parent completion status
      if (todo.subtasks.length > 0) {
        const allCompleted = todo.subtasks.every(s => s.completed);
        todo.completed = allCompleted;
        todo.completedAt = allCompleted ? Date.now() : null;
      }
      
      this._save(todos);
    }
  },

  // Focus tracking duration (in seconds)
  addFocusTime(id, seconds) {
    const todos = TodoStore.getTodos();
    const todo = todos.find(t => t.id === id);
    if (todo) {
      todo.focusSeconds = (todo.focusSeconds || 0) + seconds;
      this._save(todos);
    }
    this.addFocusLog(seconds);
  },

  getFocusLogs() {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('vercel-todo-focus-logs');
    if (!stored) {
      // Create some default focus logs for the past 7 days to seed analytics beautifully on first load
      const defaultLogs = [];
      const seedSecs = [1200, 3600, 1800, 300, 2700, 1500, 2400]; // in seconds
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        defaultLogs.push({
          date: d.toISOString().split('T')[0],
          seconds: seedSecs[6 - i]
        });
      }
      localStorage.setItem('vercel-todo-focus-logs', JSON.stringify(defaultLogs));
      return defaultLogs;
    }
    try {
      return JSON.parse(stored);
    } catch(e) {
      return [];
    }
  },

  addFocusLog(seconds) {
    if (typeof window === 'undefined') return;
    const logs = this.getFocusLogs();
    const today = new Date().toISOString().split('T')[0];
    const index = logs.findIndex(l => l.date === today);
    if (index !== -1) {
      logs[index].seconds += seconds;
    } else {
      logs.push({ date: today, seconds: seconds });
    }
    localStorage.setItem('vercel-todo-focus-logs', JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent('focus-logs:change'));
  },

  getWeeklyFocusStats() {
    const logs = this.getFocusLogs();
    const stats = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      
      stats.push({
        date: dateStr,
        dayName: days[d.getDay()],
        minutes: log ? Math.round(log.seconds / 60) : 0
      });
    }
    return stats;
  },

  // Focus lock-on state
  getActiveFocusTodoId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('active-focus-todo-id') || null;
  },

  setActiveFocusTodoId(id) {
    if (typeof window === 'undefined') return;
    if (id) {
      localStorage.setItem('active-focus-todo-id', id);
    } else {
      localStorage.removeItem('active-focus-todo-id');
    }
    window.dispatchEvent(new CustomEvent('focus-todo:change'));
  },

  // Computed metrics calculations
  getStats() {
    const todos = this.getTodos();
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    
    // Completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Total Pomodoro focus hours
    const totalFocusSeconds = todos.reduce((acc, t) => acc + (t.focusSeconds || 0), 0);
    const focusHours = (totalFocusSeconds / 3600).toFixed(1);

    // Overdue items
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    // High priority count
    const highPriority = todos.filter(t => !t.completed && t.priority === 'high').length;

    return {
      total,
      completed,
      pending,
      completionRate,
      focusHours,
      overdue,
      highPriority
    };
  },

  // Data import/export configuration backup
  exportData() {
    const todos = this.getTodos();
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `focusflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  importData(jsonContent) {
    try {
      const imported = JSON.parse(jsonContent);
      if (Array.isArray(imported)) {
        // Simple schema validation
        const isValid = imported.every(todo => 
          todo.hasOwnProperty('id') && 
          todo.hasOwnProperty('title') &&
          todo.hasOwnProperty('completed')
        );
        
        if (isValid) {
          this._save(imported);
          return { success: true };
        }
      }
      return { success: false, error: 'Invalid file format. Must be a JSON array of tasks.' };
    } catch (err) {
      return { success: false, error: 'Failed to parse JSON. Please verify file integrity.' };
    }
  },

  // Global Theme Handling
  getTheme() {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  setTheme(theme) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_KEY, theme);
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
  },

  // Pomodoro persistence (restores timer if user refreshes mid-focus session)
  getTimerState() {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(TIMER_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      // If timer is running, verify it hasn't already expired
      if (parsed.isRunning && parsed.endTime) {
        const remaining = Math.max(0, Math.round((parsed.endTime - Date.now()) / 1000));
        if (remaining > 0) {
          return { ...parsed, secondsRemaining: remaining };
        } else {
          // Timer finished while page was closed
          return { isRunning: false, secondsRemaining: 0, mode: parsed.mode };
        }
      }
      return parsed;
    } catch (e) {
      return null;
    }
  },

  setTimerState(state) {
    if (typeof window === 'undefined') return;
    if (state) {
      localStorage.setItem(TIMER_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(TIMER_KEY);
    }
  }
};
