/**
 * THE ROCK SCHOOL OF MUSIC AND ARTS - Web Application Core Logic
 * Handles Routing, State Management, Authentication, LocalStorage DB, and Interactive Timer
 */

// Custom Toast System
const toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    
    // Choose appropriate emoji
    let emoji = 'ℹ️';
    if (type === 'success') emoji = '✅';
    if (type === 'error') emoji = '❌';
    
    toastEl.innerHTML = `
      <span>${emoji}</span>
      <div>${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toastEl);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(10px)';
      setTimeout(() => toastEl.remove(), 400);
    }, 4000);
  }
};

// Seed Database Definition
const INITIAL_DATABASE = {
  users: [
    {
      id: "u_teacher_1",
      email: "teacher@therockschool.com",
      password: "password",
      name: "Sarah Jenkins",
      role: "teacher",
      instrument: "All Instruments"
    },
    {
      id: "u_student_1",
      email: "jack@example.com",
      password: "password",
      name: "Jack Ryan",
      role: "student",
      instrument: "Piano",
      practiceHours: 12.5,
      lessonTarget: "Master G major scale tempo and smooth alignment",
      badges: ["badge_first_note", "badge_grind", "badge_dedicated", "badge_rhythm"],
      feedback: [
        {
          date: "2026-05-28",
          author: "Sarah Jenkins",
          text: "Jack is making wonderful progress with G major. Ensure scales are practiced to a metronome at 80bpm."
        },
        {
          date: "2026-05-15",
          author: "Sarah Jenkins",
          text: "Excellent wrist position today! Remember to keep your fingers curved on the black keys."
        }
      ]
    },
    {
      id: "u_student_2",
      email: "clara@example.com",
      password: "password",
      name: "Clara Oswald",
      role: "student",
      instrument: "Violin",
      practiceHours: 4.8,
      lessonTarget: "Perfect bow stroke perpendicularity",
      badges: ["badge_first_note"],
      feedback: [
        {
          date: "2026-05-29",
          author: "Sarah Jenkins",
          text: "Focus on keeping the bow perpendicular to the violin strings. Great practice logs this week!"
        }
      ]
    }
  ]
};

// All available Badges/Accomplishments
const ALL_BADGES = [
  { id: "badge_first_note", name: "First Note", desc: "Logged first practice session.", emoji: "🎵" },
  { id: "badge_grind", name: "Grind", desc: "Practiced for 5+ hours total.", emoji: "⚡" },
  { id: "badge_dedicated", name: "Dedicated", desc: "Practiced for 10+ hours total.", emoji: "🔥" },
  { id: "badge_star", name: "Star Performer", desc: "Awarded for exceptional lesson preparation.", emoji: "⭐" },
  { id: "badge_rhythm", name: "Rhythm Master", desc: "Exhibits flawless timing and metronome accuracy.", emoji: "🥁" },
  { id: "badge_recital", name: "Recital Ready", desc: "Ready to perform their solo in the annual recital.", emoji: "🎭" }
];

class AppState {
  constructor() {
    this.db = null;
    this.currentUser = null;
    this.selectedStudentId = null;
    
    // Stopwatch fields
    this.timerInterval = null;
    this.timerSeconds = 0;
    this.timerRunning = false;
    
    this.init();
  }

  // Load from LocalStorage or seed new DB
  init() {
    const rawDB = localStorage.getItem('therockschool_db');
    if (!rawDB) {
      this.db = INITIAL_DATABASE;
      this.saveDB();
    } else {
      try {
        this.db = JSON.parse(rawDB);
      } catch (e) {
        this.db = INITIAL_DATABASE;
        this.saveDB();
      }
    }

    // Check if session exists in memory/sessionStorage
    const savedUser = sessionStorage.getItem('therockschool_active_user');
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        // Refresh reference from the DB
        this.currentUser = this.db.users.find(u => u.id === userObj.id) || null;
      } catch (e) {
        this.currentUser = null;
      }
    }
    
    this.updateNavigationState();
    
    if (this.currentUser) {
      if (this.currentUser.role === 'teacher') {
        this.showView('teacher-portal');
      } else {
        this.showView('student-portal');
      }
    } else {
      this.showView('landing');
    }
  }

  saveDB() {
    localStorage.setItem('therockschool_db', JSON.stringify(this.db));
  }

  // Route/View management
  showView(viewName) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
    
    // Show selected view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('nav a').forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === `#${viewName}`) {
        a.classList.add('active');
      }
    });

    // Close mobile menu if active
    // Load dashboard if logged in and accessing dashboard views
    if (viewName === 'student-portal' && this.currentUser) {
      this.renderStudentDashboard();
    } else if (viewName === 'teacher-portal' && this.currentUser) {
      this.renderTeacherDashboard();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Navigation UI switch
  updateNavigationState() {
    const navButtons = document.getElementById('auth-nav-buttons');
    const header = document.getElementById('main-header');
    
    if (!navButtons) return;

    if (this.currentUser) {
      // Logged in
      let portalButtonText = this.currentUser.role === 'teacher' ? 'Teacher Console' : 'Student Hub';
      let portalView = this.currentUser.role === 'teacher' ? 'teacher-portal' : 'student-portal';
      
      navButtons.innerHTML = `
        <div class="user-menu" onclick="app.showView('${portalView}')">
          <div class="user-avatar">${this.currentUser.name.charAt(0)}</div>
          <span style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">${this.currentUser.name}</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="app.logout()">Sign Out</button>
      `;
    } else {
      // Logged out
      navButtons.innerHTML = `
        <button class="btn btn-secondary" onclick="app.openAuthModal('login')">Sign In</button>
        <button class="btn btn-primary" onclick="app.openAuthModal('signup')">Join Class</button>
      `;
    }
  }

  // Modals management
  openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    modal.classList.add('active');
    this.switchAuthTab(tab);
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.classList.remove('active');
  }

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
  }

  // Authentication controllers
  handleAuthSubmit(event, mode) {
    event.preventDefault();

    if (mode === 'login') {
      const email = document.getElementById('l-email').value.trim();
      const password = document.getElementById('l-password').value;

      const user = this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (user) {
        this.login(user);
        this.closeAuthModal();
      } else {
        toast.show("Invalid email or password. Try teacher@therockschool.com", "error");
      }
    } else {
      // Sign Up
      const name = document.getElementById('s-name').value.trim();
      const email = document.getElementById('s-email').value.trim();
      const password = document.getElementById('s-password').value;
      const instrument = document.getElementById('s-instrument').value;
      const isTeacher = document.getElementById('s-is-teacher').checked;

      // Check duplicate email
      const exist = this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (exist) {
        toast.show("Email already registered!", "error");
        return;
      }

      const newUser = {
        id: "u_" + (isTeacher ? "teacher_" : "student_") + Date.now(),
        email,
        password,
        name,
        role: isTeacher ? "teacher" : "student",
        instrument: isTeacher ? "All Instruments" : instrument,
        practiceHours: 0,
        lessonTarget: isTeacher ? "" : "First session goal not assigned yet.",
        badges: isTeacher ? [] : [],
        feedback: isTeacher ? [] : []
      };

      this.db.users.push(newUser);
      this.saveDB();
      this.login(newUser);
      this.closeAuthModal();
      toast.show("Account created successfully!", "success");
    }
  }

  login(user) {
    this.currentUser = user;
    sessionStorage.setItem('therockschool_active_user', JSON.stringify({ id: user.id }));
    this.updateNavigationState();
    
    if (user.role === 'teacher') {
      this.showView('teacher-portal');
    } else {
      this.showView('student-portal');
    }
    toast.show(`Logged in as ${user.name}`, "success");
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('therockschool_active_user');
    this.stopTimer(); // Ensure timer stops on logout
    this.updateNavigationState();
    this.showView('landing');
    toast.show("Logged out successfully", "info");
  }

  // Student Dashboard Renders
  renderStudentDashboard() {
    if (!this.currentUser) return;

    // Display fields
    document.getElementById('student-display-name').textContent = this.currentUser.name;
    document.getElementById('student-assigned-instrument').textContent = this.currentUser.instrument;
    document.getElementById('stat-total-practice').textContent = `${this.currentUser.practiceHours.toFixed(1)} hrs`;
    document.getElementById('student-lesson-target').textContent = this.currentUser.lessonTarget || "No current targets assigned.";

    // Render Accomplishments/Badges
    const badgesContainer = document.getElementById('student-badges-container');
    badgesContainer.innerHTML = '';
    
    let unlockedCount = 0;
    ALL_BADGES.forEach(badge => {
      const isUnlocked = this.currentUser.badges.includes(badge.id);
      if (isUnlocked) unlockedCount++;

      const badgeEl = document.createElement('div');
      badgeEl.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
      badgeEl.innerHTML = `
        <div class="badge-icon">${badge.emoji}</div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-tooltip"><strong>${badge.name}</strong><br>${badge.desc}</div>
      `;
      badgesContainer.appendChild(badgeEl);
    });

    document.getElementById('stat-badges-unlocked').textContent = `${unlockedCount}/${ALL_BADGES.length}`;

    // Render timeline logs
    const timeline = document.getElementById('student-feedback-timeline');
    timeline.innerHTML = '';
    
    if (!this.currentUser.feedback || this.currentUser.feedback.length === 0) {
      timeline.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px 0;">No teacher notes or class feedback logs found yet.</p>`;
    } else {
      this.currentUser.feedback.forEach(item => {
        const card = document.createElement('div');
        card.className = 'feedback-card';
        card.innerHTML = `
          <div class="feedback-meta">
            <span class="feedback-author">Instructor ${item.author}</span>
            <span class="feedback-date">${item.date}</span>
          </div>
          <p class="feedback-text">${item.text}</p>
        `;
        timeline.appendChild(card);
      });
    }
  }

  // Timer stopwatch actions
  toggleTimer() {
    const btn = document.getElementById('btn-timer-start');
    const clock = document.getElementById('timer-clock');
    const btnReset = document.getElementById('btn-timer-reset');

    if (this.timerRunning) {
      // Pause/Stop practice
      this.stopTimer();
      btn.textContent = 'Start Practice';
      btn.className = 'btn btn-primary';
      clock.classList.remove('running');
      btnReset.removeAttribute('disabled');

      // Prompt to save elapsed time
      if (this.timerSeconds >= 10) { // minimum 10 seconds of practice to log
        const hoursLogged = this.timerSeconds / 3600;
        this.currentUser.practiceHours += hoursLogged;

        // Auto award Grind/Dedicated badges based on new hours
        if (this.currentUser.practiceHours >= 5 && !this.currentUser.badges.includes('badge_grind')) {
          this.currentUser.badges.push('badge_grind');
          toast.show("Achievement unlocked: Grind! (5+ Practice hours)", "success");
        }
        if (this.currentUser.practiceHours >= 10 && !this.currentUser.badges.includes('badge_dedicated')) {
          this.currentUser.badges.push('badge_dedicated');
          toast.show("Achievement unlocked: Dedicated! (10+ Practice hours)", "success");
        }
        if (!this.currentUser.badges.includes('badge_first_note')) {
          this.currentUser.badges.push('badge_first_note');
          toast.show("Achievement unlocked: First Note!", "success");
        }

        // Save DB
        this.saveDB();
        
        toast.show(`Logged ${Math.floor(this.timerSeconds)} seconds of practice! Total hours updated.`, "success");
        this.renderStudentDashboard();
      } else {
        toast.show("Practice session too short to log (min 10s)", "info");
      }
    } else {
      // Start practice
      this.timerRunning = true;
      btn.textContent = 'Pause & Log Practice';
      btn.className = 'btn btn-danger';
      clock.classList.add('running');
      btnReset.setAttribute('disabled', 'true');

      this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(this.timerSeconds % 60).toString().padStart(2, '0');
        clock.textContent = `${mins}:${secs}`;
      }, 1000);
      
      toast.show("Practice session started! Keep it up!", "info");
    }
  }

  stopTimer() {
    this.timerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.stopTimer();
    this.timerSeconds = 0;
    document.getElementById('timer-clock').textContent = '00:00';
    document.getElementById('btn-timer-start').textContent = 'Start Practice';
    document.getElementById('btn-timer-start').className = 'btn btn-primary';
    document.getElementById('timer-clock').classList.remove('running');
    document.getElementById('btn-timer-reset').setAttribute('disabled', 'true');
    toast.show("Stopwatch reset", "info");
  }

  // Teacher Dashboard controls
  renderTeacherDashboard() {
    if (!this.currentUser) return;
    document.getElementById('teacher-display-name').textContent = this.currentUser.name;

    const studentListContainer = document.getElementById('teacher-student-list');
    studentListContainer.innerHTML = '';

    // Filter students
    const students = this.db.users.filter(u => u.role === 'student');

    if (students.length === 0) {
      studentListContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px 0;">No students registered yet.</p>';
      return;
    }

    students.forEach(student => {
      const activeClass = this.selectedStudentId === student.id ? 'active' : '';
      const card = document.createElement('div');
      card.className = `student-selector-item ${activeClass}`;
      card.onclick = () => this.selectStudent(student.id);
      
      card.innerHTML = `
        <div class="student-item-info">
          <h4>${student.name}</h4>
          <p>${student.instrument} | ${student.practiceHours.toFixed(1)} hrs practiced</p>
        </div>
        <div class="student-active-indicator"></div>
      `;
      studentListContainer.appendChild(card);
    });

    // Populate active editor pane if a student is selected
    const placeholder = document.getElementById('no-student-selected');
    const editor = document.getElementById('student-editor-active');
    
    if (this.selectedStudentId) {
      const studentObj = this.db.users.find(u => u.id === this.selectedStudentId);
      if (studentObj) {
        placeholder.style.display = 'none';
        editor.style.display = 'block';

        document.getElementById('editor-student-name').textContent = studentObj.name;
        document.getElementById('editor-student-meta').textContent = `${studentObj.instrument} | Total Practice: ${studentObj.practiceHours.toFixed(1)} hrs`;
        document.getElementById('edit-goal-input').value = studentObj.lessonTarget || '';

        // Render accomplishments checkboxes picker
        const badgePicker = document.getElementById('teacher-badge-picker');
        badgePicker.innerHTML = '';

        ALL_BADGES.forEach(badge => {
          const isSelected = studentObj.badges.includes(badge.id);
          const pickerItem = document.createElement('div');
          pickerItem.className = `badge-picker-item ${isSelected ? 'selected' : ''}`;
          pickerItem.onclick = () => this.toggleStudentBadge(studentObj.id, badge.id);
          
          pickerItem.innerHTML = `
            <div class="badge-icon">${badge.emoji}</div>
            <div class="badge-name" style="font-size: 0.6rem; text-align: center; margin-top: 5px;">${badge.name}</div>
          `;
          badgePicker.appendChild(pickerItem);
        });
      }
    } else {
      placeholder.style.display = 'block';
      editor.style.display = 'none';
    }
  }

  selectStudent(studentId) {
    this.selectedStudentId = studentId;
    this.renderTeacherDashboard();
  }

  // Update target lesson plan
  updateStudentGoal(event) {
    event.preventDefault();
    if (!this.selectedStudentId) return;

    const studentObj = this.db.users.find(u => u.id === this.selectedStudentId);
    const newGoal = document.getElementById('edit-goal-input').value.trim();

    if (studentObj) {
      studentObj.lessonTarget = newGoal;
      this.saveDB();
      toast.show(`Updated goal target for ${studentObj.name}`, "success");
      this.renderTeacherDashboard();
    }
  }

  // Toggle student achievements
  toggleStudentBadge(studentId, badgeId) {
    const studentObj = this.db.users.find(u => u.id === studentId);
    if (!studentObj) return;

    const idx = studentObj.badges.indexOf(badgeId);
    if (idx > -1) {
      studentObj.badges.splice(idx, 1);
      toast.show("Achievement removed", "info");
    } else {
      studentObj.badges.push(badgeId);
      toast.show("Achievement awarded successfully!", "success");
    }

    this.saveDB();
    this.renderTeacherDashboard();
  }

  // Post feedback comment
  addTeacherFeedback(event) {
    event.preventDefault();
    if (!this.selectedStudentId) return;

    const studentObj = this.db.users.find(u => u.id === this.selectedStudentId);
    const text = document.getElementById('edit-feedback-input').value.trim();

    if (studentObj) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      
      const newReview = {
        date: dateStr,
        author: this.currentUser.name,
        text
      };

      if (!studentObj.feedback) studentObj.feedback = [];
      studentObj.feedback.unshift(newReview); // Put newest reviews at beginning

      this.saveDB();
      document.getElementById('edit-feedback-input').value = '';
      toast.show(`Posted lesson review to ${studentObj.name}'s log`, "success");
      this.renderTeacherDashboard();
    }
  }

  // Contact form handler
  handleContactSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('c-name').value.trim();
    const instrument = document.getElementById('c-instrument').value;

    toast.show(`Thank you, ${name}! Your inquiry for ${instrument} lessons has been sent. We'll reply within 24 hours.`, "success");
    
    // Clear form
    document.getElementById('contactForm').reset();
  }
}

// Instantiate state controller on page load
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AppState();

  // Scroll Header Effect
  window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
});
