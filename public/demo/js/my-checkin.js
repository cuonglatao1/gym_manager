// ===== MEMBER CHECK-IN FUNCTIONS =====

/**
 * Load my today's schedules
 */
async function loadMyTodaySchedules() {
    showLoading('myCheckInsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall('/classes/my/today-schedules');
        
        if (response.success) {
            const schedules = response.data || [];
            
            document.getElementById('myCheckInsTitle').innerText = `📅 Today's Classes (${schedules.length})`;
            
            if (schedules.length === 0) {
                document.getElementById('myCheckInsContainer').innerHTML = `
                    <div class="info">📅 You have no classes scheduled for today</div>
                `;
                return;
            }

            displayMyTodaySchedules(schedules);
        }
    } catch (error) {
        showError('myCheckInsContainer', error.message);
    }
}

/**
 * Display my today's schedules
 */
function displayMyTodaySchedules(schedules) {
    const html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Class & Type</th>
                        <th>Time</th>
                        <th>Trainer</th>
                        <th>Room</th>
                        <th>Schedule Code</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedules.map(schedule => {
                        const classInfo = schedule.class || {};
                        const classType = classInfo.classType || {};
                        const trainer = schedule.trainer || {};
                        const enrollment = schedule.enrollment || {};
                        
                        const startTime = new Date(schedule.startTime);
                        const endTime = new Date(schedule.endTime);
                        const now = new Date();
                        
                        // Check if can check in (15 minutes before to 30 minutes after class starts)
                        const canCheckInStart = new Date(startTime.getTime() - 15 * 60 * 1000);
                        const canCheckInEnd = new Date(startTime.getTime() + 30 * 60 * 1000);
                        const canCheckIn = now >= canCheckInStart && now <= canCheckInEnd;
                        
                        const scheduleCode = `SCH${schedule.id.toString().padStart(6, '0')}`;
                        
                        return `
                            <tr style="${enrollment.status === 'attended' ? 'background: #f8fff8;' : ''}">
                                <td>
                                    <strong>${classInfo.name || 'N/A'}</strong><br>
                                    <small style="color: ${classType.color || '#666'}; font-weight: bold;">${classType.name || 'N/A'}</small>
                                </td>
                                <td>
                                    <strong>${startTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</strong> - 
                                    ${endTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}<br>
                                    <small style="color: #666;">${startTime.toLocaleDateString('vi-VN')}</small>
                                </td>
                                <td>${trainer.fullName || 'N/A'}</td>
                                <td>${schedule.room || 'N/A'}</td>
                                <td>
                                    <code style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer;" 
                                          title="Click to copy code for check-in" 
                                          onclick="copyToClipboard('${scheduleCode}')">${scheduleCode}</code>
                                    <br><small style="color: #666; font-size: 10px;">Tap to copy</small>
                                </td>
                                <td>
                                    <span class="badge badge-${enrollment.status === 'attended' ? 'success' : enrollment.status === 'enrolled' ? 'primary' : 'secondary'}">
                                        ${enrollment.status === 'attended' ? 'Checked In' : enrollment.status === 'enrolled' ? 'Enrolled' : 'Not Enrolled'}
                                    </span>
                                    ${enrollment.checkinTime ? `<br><small style="color: #28a745;">✓ ${new Date(enrollment.checkinTime).toLocaleTimeString('vi-VN')}</small>` : ''}
                                </td>
                                <td>
                                    ${enrollment.status === 'enrolled' && canCheckIn && !enrollment.checkinTime ? `
                                        <button class="btn btn-sm btn-success" onclick="quickCheckInById(${schedule.id})" style="font-size: 12px;">
                                            ✅ Check In
                                        </button>
                                    ` : enrollment.status === 'attended' ? `
                                        <span style="color: #28a745; font-size: 12px;">✓ Checked In</span>
                                    ` : enrollment.status === 'enrolled' && !canCheckIn ? `
                                        <span style="color: #666; font-size: 12px;">
                                            ${now < canCheckInStart ? 'Too Early' : 'Too Late'}
                                        </span>
                                    ` : `
                                        <span style="color: #999; font-size: 12px;">Not Available</span>
                                    `}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 13px; color: #666;">
            <strong>💡 Check-in Tips:</strong><br>
            • You can check in 15 minutes before class starts up to 30 minutes after<br>
            • Use the schedule code or quick check-in button<br>
            • QR codes contain the schedule code for easy scanning
        </div>
    `;
    
    document.getElementById('myCheckInsContainer').innerHTML = html;
}

/**
 * Load my check-in history
 */
async function loadMyCheckIns() {
    showLoading('myCheckInsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall('/classes/my/checkins?limit=30');
        
        if (response.success) {
            const checkIns = response.data.checkIns || [];
            const pagination = response.data.pagination || {};
            
            document.getElementById('myCheckInsTitle').innerText = `📋 My Check-in History (${pagination.totalItems || checkIns.length})`;
            
            if (checkIns.length === 0) {
                document.getElementById('myCheckInsContainer').innerHTML = `
                    <div class="info">📋 You haven't checked into any classes yet</div>
                `;
                return;
            }

            displayMyCheckInHistory(checkIns, pagination);
        }
    } catch (error) {
        showError('myCheckInsContainer', error.message);
    }
}

/**
 * Display my check-in history
 */
function displayMyCheckInHistory(checkIns, pagination) {
    const html = `
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Class & Type</th>
                        <th>Date & Time</th>
                        <th>Trainer</th>
                        <th>Check-in Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${checkIns.map(checkIn => {
                        const schedule = checkIn.classSchedule || {};
                        const classInfo = schedule.class || {};
                        const classType = classInfo.classType || {};
                        const trainer = schedule.trainer || {};
                        
                        const checkInTime = new Date(checkIn.checkinTime);
                        const scheduleDate = new Date(schedule.date);
                        const startTime = new Date(schedule.startTime);
                        
                        return `
                            <tr>
                                <td>
                                    <strong>${classInfo.name || 'N/A'}</strong><br>
                                    <small style="color: ${classType.color || '#666'}; font-weight: bold;">${classType.name || 'N/A'}</small>
                                </td>
                                <td>
                                    ${scheduleDate.toLocaleDateString('vi-VN')}<br>
                                    <strong>${startTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</strong>
                                </td>
                                <td>${trainer.fullName || 'N/A'}</td>
                                <td>
                                    <strong style="color: #28a745;">${checkInTime.toLocaleTimeString('vi-VN')}</strong><br>
                                    <small style="color: #666;">${checkInTime.toLocaleDateString('vi-VN')}</small>
                                </td>
                                <td>
                                    <span class="badge badge-success">${checkIn.status || 'attended'}</span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ${pagination.totalPages > 1 ? `
            <div style="margin-top: 15px;">
                <small>Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalItems} total check-ins)</small>
            </div>
        ` : ''}
    `;
    
    document.getElementById('myCheckInsContainer').innerHTML = html;
}

/**
 * Show quick check-in form
 */
function showQuickCheckInForm() {
    document.getElementById('quickCheckInCard').style.display = 'block';
    document.getElementById('scheduleCode').focus();
    document.getElementById('quickCheckInResult').innerHTML = '';
}

/**
 * Hide quick check-in form
 */
function hideQuickCheckInForm() {
    document.getElementById('quickCheckInCard').style.display = 'none';
    document.getElementById('scheduleCode').value = '';
    document.getElementById('quickCheckInResult').innerHTML = '';
}

/**
 * Quick check-in by form submission
 */
async function quickCheckIn(event) {
    event.preventDefault();
    
    const scheduleCode = document.getElementById('scheduleCode').value.trim();
    if (!scheduleCode) {
        showError('quickCheckInResult', 'Please enter a schedule code');
        return;
    }

    showLoading('quickCheckInResult');
    
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall('/classes/my/quick-checkin', 'POST', {
            scheduleCode: scheduleCode
        });

        if (response.success) {
            document.getElementById('quickCheckInResult').innerHTML = `
                <div class="success">
                    ✅ ${response.message}<br>
                    <strong>Class:</strong> ${response.data.classInfo?.name || 'N/A'}<br>
                    <strong>Time:</strong> ${response.data.checkInTime ? new Date(response.data.checkInTime).toLocaleString('vi-VN') : 'N/A'}
                </div>
            `;
            
            // Clear the form
            document.getElementById('scheduleCode').value = '';
            
            // Refresh today's schedules if that's what's currently displayed
            if (document.getElementById('myCheckInsTitle').innerText.includes("Today's Classes")) {
                setTimeout(() => {
                    loadMyTodaySchedules();
                }, 1500);
            }
        }
    } catch (error) {
        showError('quickCheckInResult', error.message);
    }
}

/**
 * Quick check-in by schedule ID (from today's classes table)
 */
async function quickCheckInById(scheduleId) {
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall('/classes/my/quick-checkin', 'POST', {
            scheduleId: scheduleId
        });

        if (response.success) {
            showSuccess('myCheckInsContainer', `✅ ${response.message}`, 3000);
            
            // Refresh today's schedules
            setTimeout(() => {
                loadMyTodaySchedules();
            }, 1000);
        }
    } catch (error) {
        showError('myCheckInsContainer', error.message);
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied: ${text}`, 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

/**
 * Fallback copy to clipboard for older browsers
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast(`Copied: ${text}`, 'success');
    } catch (err) {
        showToast('Copy failed, please copy manually', 'error');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 2000);
}