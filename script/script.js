const App = (function() {
    const STORAGE_KEY = 'streakHealthProData';
    let data = {};
    let isShiftPressed = false;
    let rangeStartDay = null;
    let currentCalendarDate = new Date();
    let pendingCheckinDate = null;

    const DOM = {
        currentStreakVal: document.getElementById('current-streak-val'),
        longestStreakVal: document.getElementById('longest-streak-val'),
        totalCheckinsVal: document.getElementById('total-checkins-val'),
        weeklyAvgVal: document.getElementById('weekly-avg-val'),
        progressBar: document.getElementById('progress-bar'),
        calendarGrid: document.getElementById('calendar-grid'),
        timelineList: document.getElementById('timeline-list'),
        monthYearDisplay: document.getElementById('current-month-year'),
        confettiContainer: document.getElementById('confetti-container'),
        themeIcon: document.getElementById('theme-icon'),
        messageBox: document.getElementById('message-box'),
        messageText: document.getElementById('message-text'),
        messageActions: document.getElementById('message-actions'),
        modalBackdrop: document.getElementById('modal-backdrop'),
        metricModal: document.getElementById('metric-modal'),
        metricModalDate: document.getElementById('metric-modal-date'),
        metricNote: document.getElementById('metric-note'),
        moodSelector: document.getElementById('mood-selector'),
        challengeNameInput: document.getElementById('challenge-name'),
        badgeList: document.getElementById('badge-list')
    };

    const BADGES = [
        { id: 'first_checkin', threshold: 1, icon: 'fas fa-star', label: 'First Blood' },
        { id: 'week_streak', threshold: 7, icon: 'fas fa-trophy', label: 'Weekly Win' },
        { id: 'month_streak', threshold: 30, icon: 'fas fa-crown', label: 'One Month' },
        { id: 'high_achiever', threshold: 60, icon: 'fas fa-fire', label: '60 Days' },
        { id: 'ninety_percent', threshold: 81, icon: 'fas fa-certificate', label: '90% Done' }
    ];
    const dateToString = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const stringToDate = (str) => {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    };
    const showMessage = (text, type = 'info', actions = []) => {
        DOM.messageText.textContent = text;
        DOM.messageActions.innerHTML = '';
        DOM.messageBox.style.display = 'block';

        const borderColor = type === 'danger' ? 'var(--color-danger)' : (type === 'success' ? 'var(--color-accent-mint)' : 'var(--color-accent-blue)');
        DOM.messageBox.style.borderColor = borderColor;

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `btn btn-${action.style || 'secondary'}`;
            btn.textContent = action.label;
            btn.style.marginLeft = '10px';
            btn.onclick = () => {
                action.callback();
                hideMessage();
            };
            DOM.messageActions.appendChild(btn);
        });

        if (actions.length === 0) {
            setTimeout(hideMessage, 4000);
        }
    };

    const hideMessage = () => {
        DOM.messageBox.style.display = 'none';
    };

    const showModal = (modalElement) => {
        DOM.modalBackdrop.style.display = 'block';
        modalElement.style.display = 'block';
    }

    const hideModal = (modalElement) => {
        DOM.modalBackdrop.style.display = 'none';
        modalElement.style.display = 'none';
    }

    const loadData = () => {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            try {
                data = JSON.parse(storedData);
            } catch (e) {
                console.error('Error parsing stored data:', e);
                data = {};
            }
        }

        if (!data.checkins) data.checkins = {};
        if (!data.longestStreak) data.longestStreak = 0;
        if (!data.theme) data.theme = 'dark';
        if (!data.challengeName) data.challengeName = 'My 90-Day Challenge';
        if (!data.unlockedBadges) data.unlockedBadges = [];

        DOM.challengeNameInput.value = data.challengeName;
        applyTheme(data.theme);
    };

    const saveData = () => {
        data.challengeName = DOM.challengeNameInput.value || 'My 90-Day Challenge';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateStats();
        renderCalendar();
        renderTimeline();
        renderBadges();
    };

    const calculateStreaks = () => {
        const checkedDays = Object.keys(data.checkins)
            .map(stringToDate)
            .sort((a, b) => a - b);

        data.totalCheckins = checkedDays.length;

        if (checkedDays.length === 0) {
            data.currentStreak = 0;
            return;
        }

        let currentStreak = 0;
        const todayStr = dateToString(new Date());
        const today = stringToDate(todayStr);

        let dayPointer = data.checkins[todayStr] ? today : new Date(today.getTime() - 86400000); // Start from today or yesterday
        let isStreakActive = false;

        if (data.checkins[dateToString(dayPointer)]) {
            currentStreak = 1;
            isStreakActive = true;
            dayPointer.setDate(dayPointer.getDate() - 1);
        }

        while (isStreakActive) {
            const dateStr = dateToString(dayPointer);
            if (data.checkins[dateStr]) {
                currentStreak++;
                dayPointer.setDate(dayPointer.getDate() - 1);
            } else {
                isStreakActive = false;
            }
        }
        data.currentStreak = currentStreak;

        let longestStreak = 0;
        let maxStreak = 0;
        let lastDate = null;

        for (const currentDate of checkedDays) {
            if (lastDate) {
                const diffTime = currentDate.getTime() - lastDate.getTime();
                const diffDays = Math.round(diffTime / 86400000);
                if (diffDays === 1) {
                    maxStreak++;
                } else if (diffDays > 1) {
                    maxStreak = 1;
                }
            } else {
                maxStreak = 1;
            }
            longestStreak = Math.max(longestStreak, maxStreak);
            lastDate = currentDate;
        }

        data.longestStreak = Math.max(data.longestStreak, longestStreak);
        checkMilestones(data.totalCheckins);
    };

    const updateStats = () => {
        calculateStreaks();

        const totalDaysGoal = 90;
        const totalCheckins = data.totalCheckins;
        const weeklyAvg = totalCheckins > 0 ? (totalCheckins / totalDaysGoal * 7).toFixed(1) : '0.0';
        const progress = Math.min(100, (totalCheckins / totalDaysGoal) * 100);

        DOM.currentStreakVal.textContent = data.currentStreak;
        DOM.longestStreakVal.textContent = data.longestStreak;
        DOM.totalCheckinsVal.textContent = totalCheckins;
        DOM.weeklyAvgVal.textContent = weeklyAvg;
        DOM.progressBar.style.width = `${progress}%`;

        if (progress >= 90) {
            DOM.progressBar.style.background = 'linear-gradient(90deg, #10B981, #34D399)';
            if (data.unlockedBadges.indexOf('ninety_percent') === -1) {
                 checkMilestones(totalCheckins);
            }
        } else {
            DOM.progressBar.style.background = 'linear-gradient(90deg, var(--color-accent-violet), var(--color-accent-mint))';
        }
    };

    const checkMilestones = (totalCheckins) => {
        BADGES.forEach(badge => {
            if (totalCheckins >= badge.threshold && data.unlockedBadges.indexOf(badge.id) === -1) {
                data.unlockedBadges.push(badge.id);
                showMessage(`Milestone Unlocked: ${badge.label}!`, 'success');
                launchConfetti(true);
            }
        });
        renderBadges();
    };

    const renderBadges = () => {
        DOM.badgeList.innerHTML = '';
        BADGES.forEach(badge => {
            const isUnlocked = data.unlockedBadges.indexOf(badge.id) !== -1;
            const badgeItem = document.createElement('div');
            badgeItem.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
            badgeItem.title = isUnlocked ? `${badge.label}: Achieved ${badge.threshold} Check-ins!` : `${badge.label}: Requires ${badge.threshold} Check-ins`;
            badgeItem.innerHTML = `
                <i class="${badge.icon} badge-icon"></i>
                <span class="badge-label">${isUnlocked ? 'DONE' : badge.threshold}</span>
            `;
            DOM.badgeList.appendChild(badgeItem);
        });
    };

    const renderCalendar = () => {
        DOM.calendarGrid.innerHTML = '';
        const today = new Date();
        const todayStr = dateToString(today);
        const renderStartDate = new Date(today);
        renderStartDate.setDate(today.getDate() - 45);

        const renderEndDate = new Date(today);
        renderEndDate.setDate(today.getDate() + 44);

        DOM.monthYearDisplay.textContent = `${renderStartDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })} — ${renderEndDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
        for (let i = 0; i < 90; i++) {
            const dayDate = new Date(renderStartDate);
            dayDate.setDate(renderStartDate.getDate() + i);
            const dayStr = dateToString(dayDate);
            const dayNum = dayDate.getDate();
            const checkinData = data.checkins[dayStr];

            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.textContent = dayNum;
            cell.dataset.date = dayStr;
            cell.title = dayStr;

            if (checkinData) {
                cell.classList.add('checked');
                cell.dataset.mood = checkinData.mood || 3;
                cell.title += `\nMood: ${checkinData.mood || 'N/A'}\nNote: ${checkinData.note || 'None'}`;
                cell.innerHTML += `<div class="mood-dot"></div>`;
            }

            if (dayDate > today) {
                cell.classList.add('inactive');
            } else {
                cell.onclick = (e) => handleDayClick(e, dayStr);
                cell.onmouseover = () => handleDayHover(dayStr);
                cell.onmouseleave = clearRangeSelection;
            }

            if (dayStr === todayStr) {
                cell.classList.add('current-day');
            }

            DOM.calendarGrid.appendChild(cell);
        }
    };

    const handleDayClick = (e, dateStr) => {
        const dayDate = stringToDate(dateStr);

        if (isShiftPressed) {
            if (rangeStartDay) {
                markDateRange(rangeStartDay, dayDate);
                rangeStartDay = null;
                isShiftPressed = false;
            } else {
                rangeStartDay = dayDate;
                showMessage('Range selection started. Now **Shift+Click** the end date to mark the range.', 'info');
            }
        } else {
            if (data.checkins[dateStr]) {
                delete data.checkins[dateStr];
                saveData();
                showMessage('Check-in removed.', 'info');
            } else {
                prepareMetricModal(dateStr);
            }
        }
    };

    const markDateRange = (start, end) => {
        let d1 = Math.min(start.getTime(), end.getTime());
        let d2 = Math.max(start.getTime(), end.getTime());
        let currentDate = new Date(d1);

        const days = Math.round((d2 - d1) / 86400000) + 1;
        const note = prompt(`Optional: Add a note for this ${days}-day bulk check-in:`);

        let count = 0;
        while (currentDate.getTime() <= d2) {
            const dateStr = dateToString(currentDate);
            if (currentDate <= new Date()) {
                data.checkins[dateStr] = { date: dateStr, note: note || 'Bulk check-in', mood: 3 };
                count++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (count > 0) {
            saveData();
            showMessage(`Successfully marked ${count} days!`, 'success');
        } else {
            showMessage('No days were marked.', 'info');
        }
    };

    const handleDayHover = (dateStr) => {
        if (!isShiftPressed || !rangeStartDay) return;

        clearRangeSelection();

        const hoverDate = stringToDate(dateStr);
        const start = rangeStartDay.getTime();
        const end = hoverDate.getTime();
        const d1 = Math.min(start, end);
        const d2 = Math.max(start, end);

        document.querySelectorAll('.day-cell').forEach(cell => {
            const cellDate = stringToDate(cell.dataset.date);
            const cellTime = cellDate.getTime();
            if (cellTime >= d1 && cellTime <= d2 && cellDate <= new Date()) {
                cell.classList.add('range-selected');
            }
        });
    };

    const clearRangeSelection = () => {
        document.querySelectorAll('.day-cell.range-selected').forEach(cell => {
            cell.classList.remove('range-selected');
        });
    };

    const prepareMetricModal = (dateStr) => {
        pendingCheckinDate = dateStr;
        DOM.metricModalDate.textContent = new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
        DOM.metricNote.value = '';
        document.querySelectorAll('.mood-selector span').forEach(s => s.classList.remove('selected'));
        document.querySelector('.mood-selector span[data-mood="3"]').classList.add('selected');
        showModal(DOM.metricModal);
    };

    const confirmMetricLog = () => {
        if (!pendingCheckinDate) return;

        const selectedMoodElement = DOM.moodSelector.querySelector('.selected');
        const moodScore = selectedMoodElement ? parseInt(selectedMoodElement.dataset.mood) : 3;
        const note = DOM.metricNote.value.trim();

        data.checkins[pendingCheckinDate] = {
            date: pendingCheckinDate,
            note: note,
            mood: moodScore
        };

        saveData();
        hideModal(DOM.metricModal);

        if (pendingCheckinDate === dateToString(new Date())) {
            launchConfetti();
        }
        showMessage('Daily check-in logged!', 'success');
        pendingCheckinDate = null;
    };

    const cancelMetricLog = () => {
        hideModal(DOM.metricModal);
        pendingCheckinDate = null;
    };

    const setupMoodSelector = () => {
        DOM.moodSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN' && e.target.dataset.mood) {
                document.querySelectorAll('.mood-selector span').forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');
            }
        });
    };

    const renderTimeline = () => {
        DOM.timelineList.innerHTML = '';
        const checkinEntries = Object.values(data.checkins)
            .sort((a, b) => stringToDate(b.date) - stringToDate(a.date));

        if (checkinEntries.length === 0) {
            DOM.timelineList.innerHTML = `<p class="challenge-goal" style="text-align: center;">No check-ins yet. Start your ${data.challengeName} streak today!</p>`;
            return;
        }

        checkinEntries.slice(0, 8).forEach(entry => {
            const dateDisplay = new Date(entry.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
            const moodEmoji = ['😩', '😕', '😐', '😊', '😁'][entry.mood - 1] || '😐';
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-date"><span style="margin-right: 8px;">${moodEmoji}</span> ${dateDisplay}</div>
                    <div class="timeline-note">${entry.note || 'No note provided.'}</div>
                </div>
            `;
            DOM.timelineList.appendChild(item);
        });
    };

    const applyTheme = (theme) => {
        data.theme = 'dark';
        DOM.themeIcon.className = 'fas fa-sun';
    };

    const toggleTheme = () => {
        showMessage('Theme switching is disabled to maintain the premium dark glassmorphism aesthetic!', 'info');
    };

    const requestNotificationPermission = () => {
        if (!("Notification" in window)) {
            showMessage("This browser does not support desktop notifications.", 'info');
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showMessage("Notification permission granted!", 'success');
            } else if (permission === "denied") {
                showMessage("Notification permission denied. Cannot send reminders.", 'danger');
            } else {
                showMessage("Permission request ignored. Please allow notifications.", 'info');
            }
        });
    };

    const exportData = () => {
        const filename = `StreakHealthPro_${dateToString(new Date())}.json`;
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Data successfully exported!', 'info');
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.checkins) {
                    data = importedData;
                    saveData();
                    showMessage('Data successfully imported and restored! Stats updated.', 'success');
                } else {
                    throw new Error('Invalid file structure. Missing "checkins" property.');
                }
            } catch (error) {
                showMessage(`Error importing data: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const resetDataConfirmation = () => {
        showMessage('Are you sure you want to reset ALL streak data? This cannot be undone.', 'danger', [
            { label: 'Cancel', callback: hideMessage, style: 'secondary' },
            { label: 'Yes, Reset', callback: resetData, style: 'danger' }
        ]);
    };

    const resetData = () => {
        localStorage.removeItem(STORAGE_KEY);
        loadData();
        saveData();
        showMessage('Streak data has been completely reset.', 'info');
    };

    const promptFastStart = () => {
        const days = parseInt(prompt('Enter the number of days for your existing streak (e.g., 30):'));
        if (!isNaN(days) && days > 0) {
            fastStart(days);
        } else if (days !== null) {
            showMessage('Invalid number entered.', 'danger');
        }
    };

    const fastStart = (days) => {
        if (days < 1) return;
        data.checkins = {};
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const checkinDate = new Date(today);
            checkinDate.setDate(today.getDate() - i);
            const dateStr = dateToString(checkinDate);
            data.checkins[dateStr] = { date: dateStr, note: 'Fast-Start (Initial log)', mood: 3 };
        }

        data.longestStreak = days;
        data.unlockedBadges = [];
        saveData();
        showMessage(`Fast-Start successful! Streak set to ${days} days.`, 'success');
    };
    const launchConfetti = (isMilestone = false) => {
        const numPieces = isMilestone ? 100 : 50;
        for (let i = 0; i < numPieces; i++) {
            const confetti = document.createElement('div');
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = confetti.style.width;
            confetti.style.backgroundColor = ['var(--color-accent-mint)', 'var(--color-accent-blue)', 'var(--color-accent-violet)'][Math.floor(Math.random() * 3)];
            confetti.style.position = 'absolute';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.top = `${-20 - Math.random() * 50}px`;
            confetti.style.opacity = Math.random();
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;
            confetti.style.borderRadius = '2px';
            DOM.confettiContainer.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    };

    const setupConfettiCSS = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confetti-fall {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate(${Math.random() * 400 - 200}px, 100vh) rotate(${Math.random() * 1000}deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    };

    const init = () => {
        document.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
        document.addEventListener('keyup', (e) => { if (e.key === 'Shift') { isShiftPressed = false; clearRangeSelection(); } });
        DOM.challengeNameInput.addEventListener('input', saveData);
        setupMoodSelector();
        setupConfettiCSS();
        loadData();
        updateStats();
        renderBadges();
        renderCalendar();
        renderTimeline();
    };
    return {
        init,
        requestNotificationPermission,
        exportData,
        importData,
        resetDataConfirmation,
        promptFastStart,
        toggleTheme,
        confirmMetricLog,
        cancelMetricLog,
        changeCalendarView: (offset) => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset); renderCalendar(); },
    };
})();
window.onload = App.init;
