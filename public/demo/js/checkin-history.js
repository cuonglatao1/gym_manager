// ===== CHECK-IN MANAGEMENT FUNCTIONS =====

/**
 * Load today's check-ins
 */
async function loadTodayCheckIns() {
    showLoading('checkInsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/checkins?date=${today}`);
        
        if (response.success) {
            const checkIns = response.data.checkIns || [];
            
            if (checkIns.length === 0) {
                document.getElementById('checkInsContainer').innerHTML = `
                    <div class="info">📅 No check-ins found for today (${today})</div>
                `;
                return;
            }

            displayCheckIns(checkIns, `Today's Check-ins (${checkIns.length})`);
        }
    } catch (error) {
        showError('checkInsContainer', error.message);
    }
}

/**
 * Load all check-ins
 */
async function loadAllCheckIns() {
    showLoading('checkInsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall('/classes/checkins');
        
        if (response.success) {
            const checkIns = response.data.checkIns || [];
            const pagination = response.data.pagination || {};
            
            if (checkIns.length === 0) {
                document.getElementById('checkInsContainer').innerHTML = `
                    <div class="info">📋 No check-ins found in the system</div>
                `;
                return;
            }

            displayCheckIns(checkIns, `All Check-ins (${pagination.totalItems || checkIns.length})`);
        }
    } catch (error) {
        showError('checkInsContainer', error.message);
    }
}

/**
 * Show check-ins by date form
 */
function loadCheckInsByDateForm() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkInDate').value = today;
    document.getElementById('checkInDateCard').style.display = 'block';
    document.getElementById('checkInDateResult').innerHTML = '';
}

/**
 * Hide check-ins by date form
 */
function hideCheckInDateForm() {
    document.getElementById('checkInDateCard').style.display = 'none';
}

/**
 * Load check-ins by specific date
 */
async function loadCheckInsByDate() {
    const date = document.getElementById('checkInDate').value;
    if (!date) {
        showError('checkInDateResult', 'Please select a date');
        return;
    }

    showLoading('checkInsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const response = await apiCall(`/classes/checkins/${date}`);
        
        if (response.success) {
            const checkIns = response.data || [];
            
            if (checkIns.length === 0) {
                document.getElementById('checkInsContainer').innerHTML = `
                    <div class="info">📅 No check-ins found for ${new Date(date).toLocaleDateString('vi-VN')}</div>
                `;
                return;
            }

            displayCheckIns(checkIns, `Check-ins on ${new Date(date).toLocaleDateString('vi-VN')} (${checkIns.length})`);
            hideCheckInDateForm();
        }
    } catch (error) {
        showError('checkInsContainer', error.message);
    }
}

/**
 * Display check-ins in a table
 */
function displayCheckIns(checkIns, title) {
    const html = `
        <div class="success" style="margin-bottom: 20px;">✅ ${title}</div>
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Class & Type</th>
                        <th>Date & Time</th>
                        <th>Trainer</th>
                        <th>Check-in Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${checkIns.map(checkIn => {
                        const member = checkIn.member || {};
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
                                    <strong>${member.fullName || 'N/A'}</strong><br>
                                    <small style="color: #666;">${member.memberCode || 'N/A'}</small><br>
                                    <small style="color: #888;">${member.phone || ''}</small>
                                </td>
                                <td>
                                    <strong>${classInfo.name || 'N/A'}</strong><br>
                                    <small style="color: ${classType.color || '#666'}; font-weight: bold;">${classType.name || 'N/A'}</small><br>
                                    <small style="color: #888;">${classInfo.price ? parseFloat(classInfo.price).toLocaleString('vi-VN') + 'đ' : 'Free'}</small>
                                </td>
                                <td>
                                    ${scheduleDate.toLocaleDateString('vi-VN')}<br>
                                    <strong>${startTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</strong>
                                </td>
                                <td>${trainer.fullName || 'N/A'}</td>
                                <td>
                                    <strong>${checkInTime.toLocaleTimeString('vi-VN')}</strong><br>
                                    <small style="color: #888;">${checkInTime.toLocaleDateString('vi-VN')}</small>
                                </td>
                                <td>
                                    <span class="badge badge-${checkIn.status === 'attended' ? 'success' : 'primary'}">${checkIn.status || 'attended'}</span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('checkInsContainer').innerHTML = html;
}

// ===== MEMBER CLASS HISTORY FUNCTIONS =====

/**
 * Load member class history
 */
async function loadMemberHistory() {
    const memberId = document.getElementById('historyMemberId').value;
    if (!memberId) {
        showError('classHistoryContainer', 'Please enter Member ID');
        return;
    }

    showLoading('classHistoryContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const startDate = document.getElementById('historyStartDate').value;
        const status = document.getElementById('historyStatus').value;
        
        let url = `/classes/members/${memberId}/history?limit=50`;
        if (startDate) url += `&startDate=${startDate}`;
        if (status && status !== 'all') url += `&status=${status}`;

        const response = await apiCall(url);
        
        if (response.success) {
            const history = response.data.history || [];
            const pagination = response.data.pagination || {};
            
            if (history.length === 0) {
                document.getElementById('classHistoryContainer').innerHTML = `
                    <div class="info">📋 No class history found for Member ID ${memberId}</div>
                `;
                return;
            }

            displayClassHistory(history, pagination, memberId);
        }
    } catch (error) {
        showError('classHistoryContainer', error.message);
    }
}

/**
 * Display class history in a table
 */
function displayClassHistory(history, pagination, memberId) {
    const html = `
        <div class="success" style="margin-bottom: 20px;">
            📋 Class History for Member #${memberId} - ${pagination.totalItems || history.length} records
        </div>
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Class & Type</th>
                        <th>Date & Time</th>
                        <th>Trainer</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Enrolled At</th>
                        <th>Check-in</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(record => {
                        const schedule = record.classSchedule || {};
                        const classInfo = schedule.class || {};
                        const classType = classInfo.classType || {};
                        const trainer = schedule.trainer || {};
                        
                        const scheduleDate = new Date(schedule.date);
                        const startTime = new Date(schedule.startTime);
                        const enrolledAt = new Date(record.createdAt);
                        
                        return `
                            <tr style="${record.status === 'cancelled' ? 'opacity: 0.6;' : ''}">
                                <td>
                                    <strong>${classInfo.name || 'N/A'}</strong><br>
                                    <small style="color: ${classType.color || '#666'}; font-weight: bold;">${classType.name || 'N/A'}</small><br>
                                    <small style="color: #888;">Difficulty: ${classType.difficulty || 'N/A'}</small>
                                </td>
                                <td>
                                    ${scheduleDate.toLocaleDateString('vi-VN')}<br>
                                    <strong>${startTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</strong>
                                </td>
                                <td>${trainer.fullName || 'N/A'}</td>
                                <td>
                                    <strong>${classInfo.price ? parseFloat(classInfo.price).toLocaleString('vi-VN') + 'đ' : 'Free'}</strong>
                                </td>
                                <td>
                                    <span class="badge badge-${record.status === 'attended' ? 'success' : record.status === 'enrolled' ? 'primary' : 'danger'}">${record.status || 'enrolled'}</span>
                                </td>
                                <td>
                                    ${enrolledAt.toLocaleDateString('vi-VN')}<br>
                                    <small>${enrolledAt.toLocaleTimeString('vi-VN')}</small>
                                </td>
                                <td>
                                    ${record.checkinTime ? `
                                        <strong style="color: #28a745;">${new Date(record.checkinTime).toLocaleTimeString('vi-VN')}</strong><br>
                                        <small>${new Date(record.checkinTime).toLocaleDateString('vi-VN')}</small>
                                    ` : '<span style="color: #999;">Not checked in</span>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ${pagination.totalPages > 1 ? `
            <div style="margin-top: 15px;">
                <small>Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalItems} total records)</small>
            </div>
        ` : ''}
    `;
    
    document.getElementById('classHistoryContainer').innerHTML = html;
}

/**
 * Load member statistics
 */
async function loadMemberStats() {
    const memberId = document.getElementById('historyMemberId').value;
    if (!memberId) {
        showError('memberStatsContainer', 'Please enter Member ID');
        return;
    }

    showLoading('memberStatsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to Analytics tab and login)');
        }

        const startDate = document.getElementById('historyStartDate').value;
        
        let url = `/classes/members/${memberId}/stats`;
        if (startDate) {
            const endDate = new Date().toISOString().split('T')[0];
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }

        const response = await apiCall(url);
        
        if (response.success) {
            const stats = response.data;
            displayMemberStats(stats, memberId);
        }
    } catch (error) {
        showError('memberStatsContainer', error.message);
    }
}

/**
 * Display member statistics
 */
function displayMemberStats(stats, memberId) {
    const summary = stats.summary || {};
    const classTypeStats = stats.classTypeStats || {};
    const period = stats.period || {};
    
    const html = `
        <div class="success" style="margin-bottom: 20px;">
            📊 Statistics for Member #${memberId} 
            ${period.startDate ? `(${new Date(period.startDate).toLocaleDateString('vi-VN')} - ${new Date(period.endDate).toLocaleDateString('vi-VN')})` : ''}
        </div>
        
        <div class="stats-grid" style="margin-bottom: 20px;">
            <div class="stat-card">
                <div class="stat-number">${summary.totalClasses || 0}</div>
                <div class="stat-label">Total Classes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: #28a745;">${summary.attendedClasses || 0}</div>
                <div class="stat-label">Attended</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: #ffc107;">${summary.missedClasses || 0}</div>
                <div class="stat-label">Missed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: #dc3545;">${summary.cancelledClasses || 0}</div>
                <div class="stat-label">Cancelled</div>
            </div>
        </div>
        
        <div class="stats-grid" style="margin-bottom: 20px;">
            <div class="stat-card">
                <div class="stat-number">${summary.attendanceRate || 0}%</div>
                <div class="stat-label">Attendance Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.totalCost ? (summary.totalCost).toLocaleString('vi-VN') + 'đ' : '0đ'}</div>
                <div class="stat-label">Total Spent</div>
            </div>
        </div>
        
        ${Object.keys(classTypeStats).length > 0 ? `
            <div class="card" style="margin-top: 20px;">
                <h4>📈 Class Types Breakdown</h4>
                <div style="overflow-x: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Class Type</th>
                                <th>Total</th>
                                <th>Attended</th>
                                <th>Missed</th>
                                <th>Cancelled</th>
                                <th>Attendance Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(classTypeStats).map(([classType, stats]) => {
                                const attendanceRate = stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(1) : 0;
                                return `
                                    <tr>
                                        <td><strong>${classType}</strong></td>
                                        <td>${stats.total}</td>
                                        <td style="color: #28a745;">${stats.attended}</td>
                                        <td style="color: #ffc107;">${stats.missed}</td>
                                        <td style="color: #dc3545;">${stats.cancelled}</td>
                                        <td><strong>${attendanceRate}%</strong></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('memberStatsContainer').innerHTML = html;
}