// API Configuration and Functions
// This file contains all API-related functions that make HTTP calls to the backend

// Base API configuration
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Generic API call function
 * Handles common headers, authentication, and response formatting
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} - API response data
 */
async function apiCall(endpoint, options = {}) {
    const startTime = Date.now();
    const method = options.method || 'GET';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        };

        let response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers,
            ...options
        });

        let data = await response.json();
        const duration = Date.now() - startTime;
        
        // Check if token expired and try to refresh
        if (response.status === 401 && data.message && data.message.includes('hết hạn')) {
            console.log('🔄 Token expired, attempting refresh...');
            const refreshSuccess = await refreshAuthToken();
            
            if (refreshSuccess) {
                console.log('✅ Token refreshed successfully, retrying original request');
                // Retry the original request with new token
                const newHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                };
                
                response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    headers: newHeaders,
                    ...options
                });
                
                data = await response.json();
            }
        }
        
        // Log API call to real-time panel
        logApiCall(method, endpoint, response.status, data, duration);
        
        if (!response.ok) {
            throw new Error(data.message || 'API call failed');
        }
        
        return data;
    } catch (error) {
        const duration = Date.now() - startTime;
        logApiCall(method, endpoint, 'ERROR', { error: error.message }, duration);
        throw error;
    }
}

/**
 * Log API call to real-time response panel
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {number|string} status - Response status
 * @param {Object} data - Response data
 * @param {number} duration - Request duration in ms
 */
function logApiCall(method, endpoint, status, data, duration) {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const statusClass = status >= 200 && status < 300 ? 'status-success' : 'status-error';
    
    const logEntry = `
<span class="timestamp">[${timestamp}]</span> <span class="method">${method}</span> <span class="url">${endpoint}</span>
<span class="${statusClass}">Status: ${status}</span> | Duration: ${duration}ms
Response: ${JSON.stringify(data, null, 2)}
${'='.repeat(80)}
`;
    
    const panel = document.getElementById('apiResponsePanel');
    if (panel) {
        panel.innerHTML = logEntry + panel.innerHTML;
        // Keep only last 10 entries to prevent memory issues
        const entries = panel.innerHTML.split('='.repeat(80));
        if (entries.length > 11) {
            panel.innerHTML = entries.slice(0, 11).join('='.repeat(80));
        }
        panel.scrollTop = 0;
    }
}

/**
 * Clear API response panel
 */
function clearApiResponse() {
    const panel = document.getElementById('apiResponsePanel');
    if (panel) {
        panel.innerHTML = 'API responses sẽ hiển thị tại đây khi bạn thực hiện các thao tác...';
    }
}

/**
 * Refresh authentication token using stored refresh token
 * @returns {Promise<boolean>} - Success status
 */
async function refreshAuthToken() {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            console.warn('No refresh token available');
            return false;
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            authToken = data.data.accessToken;
            localStorage.setItem('authToken', authToken);
            // Keep the same refresh token as it's reused
            console.log('✅ Token refreshed successfully');
            return true;
        } else {
            console.error('❌ Token refresh failed:', data.message);
            // Clear stored tokens if refresh fails
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            authToken = null;
            return false;
        }
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        return false;
    }
}

/**
 * Debug Users - Get all users for debugging purposes
 * @returns {Promise<Object>} - Users debug data
 */
async function debugUsers() {
    try {
        const response = await apiCall('/debug/users');
        return response;
    } catch (error) {
        console.error('Debug users error:', error);
        throw error;
    }
}

/**
 * Debug Classes - Get classes and schedules for debugging
 * @returns {Promise<Object>} - Classes debug data
 */
async function debugClasses() {
    try {
        const response = await apiCall('/debug/classes');
        
        if (response.success) {
            const data = response.data;
            let html = '<div class="success">🔍 Debug Classes:<br>';
            
            html += `📊 Total Classes: ${data.totalClasses}<br>`;
            html += `📅 Total Schedules: ${data.totalSchedules}<br><br>`;
            
            if (data.classes.length > 0) {
                html += '<strong>Classes:</strong><br>';
                data.classes.forEach(cls => {
                    html += `🏃 ${cls.name} (ID: ${cls.id}) - Trainer: ${cls.trainerId} - Room: ${cls.room}<br>`;
                });
            }
            
            if (data.recentSchedules.length > 0) {
                html += '<br><strong>Recent Schedules:</strong><br>';
                data.recentSchedules.forEach(schedule => {
                    html += `📅 Class ${schedule.classId} - ${schedule.date} at ${new Date(schedule.startTime).toLocaleTimeString()}<br>`;
                });
            }
            
            html += '</div>';
            document.getElementById('authDemo').innerHTML = html;
        } else {
            document.getElementById('authDemo').innerHTML = `
                <div class="error">❌ Debug failed: ${response.message}</div>
            `;
        }
    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Debug error: ${error.message}</div>
        `;
    }
}

/**
 * Force create members for testing
 * @returns {Promise<Object>} - Creation result
 */
async function forceCreateMembers() {
    try {
        document.getElementById('authDemo').innerHTML = '<div class="info">🔄 Creating members...</div>';
        
        const response = await apiCall('/debug/create-members', {
            method: 'POST'
        });
        
        if (response.success) {
            document.getElementById('authDemo').innerHTML = `
                <div class="success">
                    ✅ ${response.message}<br>
                    <small>Check server console for details. Click "Debug Users" to verify.</small>
                </div>
            `;
        } else {
            document.getElementById('authDemo').innerHTML = `
                <div class="error">❌ Failed: ${response.message}</div>
            `;
        }
    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Error: ${error.message}</div>
        `;
    }
}

/**
 * Authentication - Admin Login
 * @returns {Promise<Object>} - Login response
 */
async function demoLogin() {
    try {
        const loginData = {
            email: 'admin@gym.com',
            password: 'admin123'
        };

        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });

        if (response.success) {
            authToken = response.data.accessToken;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            document.getElementById('authDemo').innerHTML = `
                <div class="success">
                    ✅ Admin Login successful! <br>
                    Role: ${response.data.user.role} <br>
                    User: ${response.data.user.fullName}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Admin Login failed: ${error.message}</div>
        `;
    }
}

/**
 * Authentication - Member Login
 * @returns {Promise<Object>} - Login response
 */
async function demoLoginMember() {
    try {
        const loginData = {
            email: 'member1@gmail.com',
            password: 'member123'
        };

        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });

        if (response.success) {
            authToken = response.data.accessToken;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            document.getElementById('authDemo').innerHTML = `
                <div class="success">
                    ✅ Member Login successful! <br>
                    Role: ${response.data.user.role} <br>
                    User: ${response.data.user.fullName} <br>
                    <small>Now you can test enrollment features!</small>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Member Login failed: ${error.message}</div>
        `;
    }
}

/**
 * Authentication - Trainer Login
 * @returns {Promise<Object>} - Login response
 */
async function demoLoginTrainer() {
    try {
        const loginData = {
            email: 'trainer1@gym.com',
            password: 'trainer123'
        };

        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });

        if (response.success) {
            authToken = response.data.accessToken;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
            document.getElementById('authDemo').innerHTML = `
                <div class="success">
                    ✅ Trainer Login successful! <br>
                    Role: ${response.data.user.role} <br>
                    User: ${response.data.user.fullName} <br>
                    <small>Now you can create classes and schedules!</small>
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Trainer Login failed: ${error.message}</div>
        `;
    }
}

/**
 * Load overview statistics
 * @returns {Promise<void>}
 */
async function loadOverviewStats() {
    try {
        // Get attendance stats for overview
        const stats = await apiCall('/classes/analytics/attendance');
        if (stats.success) {
            document.getElementById('totalSchedules').textContent = stats.data.totalSchedules || 0;
            document.getElementById('totalEnrollments').textContent = stats.data.totalEnrollments || 0;
            document.getElementById('attendanceRate').textContent = `${stats.data.attendanceRate || 0}%`;
        }
    } catch (error) {
        console.log('Stats not available yet');
    }

    try {
        // Get class types count
        const classTypes = await apiCall('/classes/types');
        if (classTypes.success) {
            document.getElementById('totalClasses').textContent = classTypes.data.length || 0;
        }
    } catch (error) {
        console.log('Class types not available yet');
    }
}

/**
 * Load class types
 * @returns {Promise<void>}
 */
async function loadClassTypes() {
    showLoading('classTypesContainer');
    try {
        const response = await apiCall('/classes/types');
        if (response.success) {
            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Color</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.map(type => `
                            <tr>
                                <td>${type.id}</td>
                                <td><strong>${type.name}</strong></td>
                                <td>${type.description || 'No description'}</td>
                                <td>
                                    <div style="width: 20px; height: 20px; background-color: ${type.color || '#667eea'}; border-radius: 3px; display: inline-block;"></div>
                                    <span style="margin-left: 5px; font-size: 12px;">${type.color || '#667eea'}</span>
                                </td>
                                <td>${new Date(type.createdAt || Date.now()).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="editClassType(${type.id})">✏️ Sửa</button>
                                    <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteClassType(${type.id}, '${type.name}')">🗑️ Xóa</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('classTypesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('classTypesContainer', error.message);
    }
}

/**
 * Load classes
 * @returns {Promise<void>}
 */
async function loadClasses() {
    showLoading('classesContainer');
    try {
        const response = await apiCall('/classes');
        if (response.success) {
            // Handle different response structures
            let classes = response.data;
            if (response.data && response.data.classes) {
                classes = response.data.classes;
            }
            if (!Array.isArray(classes)) {
                classes = [];
            }
            
            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Class Name</th>
                            <th>Type</th>
                            <th>Trainer ID</th>
                            <th>Duration</th>
                            <th>Max Capacity</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classes.map(cls => `
                            <tr>
                                <td>${cls.id}</td>
                                <td><strong>${cls.name}</strong></td>
                                <td>${cls.ClassType?.name || cls.classType?.name || 'N/A'}</td>
                                <td>${cls.trainerId || 'N/A'}</td>
                                <td>${cls.duration} min</td>
                                <td>${cls.maxCapacity || cls.maxParticipants || 'N/A'}</td>
                                <td>${cls.price?.toLocaleString('vi-VN') || '0'} VND</td>
                                <td><span class="badge badge-${cls.status === 'active' ? 'success' : 'warning'}">${cls.status || 'active'}</span></td>
                                <td>
                                    <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="viewClassDetail(${cls.id})">👁️ Xem</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total Classes:</strong> ${response.data.pagination.totalItems}</p>
            `;
            document.getElementById('classesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('classesContainer', error.message);
    }
}

/**
 * Load members
 * @returns {Promise<void>}
 */
async function loadMembers() {
    showLoading('membersContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }
        const response = await apiCall('/members');
        if (response.success) {
            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Member Code</th>
                            <th>Full Name</th>
                            <th>Phone</th>
                            <th>Join Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.members.map(member => `
                            <tr>
                                <td><strong>${member.memberCode}</strong></td>
                                <td>${member.fullName}</td>
                                <td>${member.phone}</td>
                                <td>${member.joinDate}</td>
                                <td><span class="badge badge-${member.isActive ? 'success' : 'warning'}">${member.isActive ? 'Active' : 'Inactive'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total Members:</strong> ${response.data.pagination.totalItems}</p>
            `;
            document.getElementById('membersContainer').innerHTML = html;
        }
    } catch (error) {
        showError('membersContainer', error.message);
    }
}

/**
 * Load member statistics
 * @returns {Promise<void>}
 */
async function loadMemberStats() {
    showLoading('membersContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }
        const response = await apiCall('/members/statistics');
        if (response.success) {
            const stats = response.data;
            const html = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalMembers}</div>
                        <div class="stat-label">Total Members</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.activeMembers}</div>
                        <div class="stat-label">Active Members</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.membersWithActiveMembership}</div>
                        <div class="stat-label">With Active Membership</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.membersWithoutMembership}</div>
                        <div class="stat-label">Without Membership</div>
                    </div>
                </div>
            `;
            document.getElementById('membersContainer').innerHTML = html;
        }
    } catch (error) {
        showError('membersContainer', error.message);
    }
}

/**
 * Load popular classes
 * @returns {Promise<void>}
 */
async function loadPopularClasses() {
    showLoading('popularClassesContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }
        const response = await apiCall('/classes/analytics/popular?limit=5');
        if (response.success) {
            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Type</th>
                            <th>Difficulty</th>
                            <th>Enrollments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.map(cls => `
                            <tr>
                                <td><strong>${cls.name}</strong></td>
                                <td>${cls.classType ? cls.classType.name : 'N/A'}</td>
                                <td><span class="badge badge-${cls.classType && cls.classType.difficulty === 'beginner' ? 'success' : 'primary'}">${cls.classType ? cls.classType.difficulty : 'N/A'}</span></td>
                                <td>${cls.enrollmentCount || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('popularClassesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('popularClassesContainer', error.message);
    }
}

/**
 * Load attendance statistics
 * @returns {Promise<void>}
 */
async function loadAttendanceStats() {
    showLoading('attendanceStatsContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }
        const response = await apiCall('/classes/analytics/attendance');
        if (response.success) {
            const stats = response.data;
            const html = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalSchedules}</div>
                        <div class="stat-label">Total Schedules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalEnrollments}</div>
                        <div class="stat-label">Total Enrollments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalAttendance}</div>
                        <div class="stat-label">Attended</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.attendanceRate}%</div>
                        <div class="stat-label">Attendance Rate</div>
                    </div>
                </div>
            `;
            document.getElementById('attendanceStatsContainer').innerHTML = html;
        }
    } catch (error) {
        showError('attendanceStatsContainer', error.message);
    }
}

/**
 * Create demo class type
 * @returns {Promise<void>}
 */
async function demoCreateClassType() {
    try {
        if (!authToken) {
            throw new Error('Please login first');
        }

        const classTypeData = {
            name: `Demo Class ${Date.now()}`,
            description: 'Auto-generated demo class type',
            duration: 45,
            maxParticipants: 15,
            equipment: ['demo equipment'],
            difficulty: 'intermediate',
            color: '#ff6b6b'
        };

        const response = await apiCall('/classes/types', {
            method: 'POST',
            body: JSON.stringify(classTypeData)
        });

        document.getElementById('classDemo').innerHTML = `
            <div class="success">✅ Class type created: ${response.data.name}</div>
        `;
    } catch (error) {
        document.getElementById('classDemo').innerHTML = `
            <div class="error">❌ Failed: ${error.message}</div>
        `;
    }
}

/**
 * Create demo class
 * @returns {Promise<void>}
 */
async function demoCreateClass() {
    try {
        if (!authToken) {
            throw new Error('Please login first');
        }

        // First get available class types
        const typesResponse = await apiCall('/classes/types');
        if (!typesResponse.success || !typesResponse.data || typesResponse.data.length === 0) {
            throw new Error('No class types available. Please create a class type first.');
        }

        const firstClassType = typesResponse.data[0];
        
        // Get current user info for trainerId
        const userResponse = await apiCall('/auth/me');
        if (!userResponse.success) {
            throw new Error('Cannot get current user info. Please login again.');
        }

        const classData = {
            classTypeId: firstClassType.id,
            name: `Demo ${firstClassType.name} Class ${Date.now()}`,
            description: 'Auto-generated demo class',
            trainerId: userResponse.data.id, // Use current user as trainer
            duration: firstClassType.duration || 60,
            maxParticipants: firstClassType.maxParticipants || 20,
            price: 150000,
            room: 'Demo Studio'
        };

        const response = await apiCall('/classes', {
            method: 'POST',
            body: JSON.stringify(classData)
        });

        document.getElementById('classDemo').innerHTML = `
            <div class="success">✅ Class created: ${response.data.name}</div>
        `;
    } catch (error) {
        document.getElementById('classDemo').innerHTML = `
            <div class="error">❌ Failed: ${error.message}</div>
        `;
    }
}

/**
 * Create demo schedule
 * @returns {Promise<void>}
 */
async function demoCreateSchedule() {
    try {
        if (!authToken) {
            throw new Error('Please login first');
        }

        // First, get available classes
        const classesResponse = await apiCall('/classes');
        if (!classesResponse.success || !classesResponse.data.classes || classesResponse.data.classes.length === 0) {
            throw new Error('No classes available. Please create a class first.');
        }

        const firstClass = classesResponse.data.classes[0];
        console.log(`Using class: ${firstClass.name} (ID: ${firstClass.id})`);

        // Get current user info for trainerId
        const userResponse = await apiCall('/auth/me');
        if (!userResponse.success) {
            throw new Error('Cannot get current user info. Please login again.');
        }

        // Create schedule for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startTime = new Date(tomorrow);
        startTime.setHours(14, 0, 0, 0); // 2 PM tomorrow
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + (firstClass.duration || 60));

        const scheduleData = {
            date: tomorrow.toISOString().split('T')[0],
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            trainerId: userResponse.data.id,
            maxParticipants: firstClass.maxParticipants || 20,
            room: firstClass.room || 'Demo Studio',
            notes: `Demo schedule for ${firstClass.name} - ${new Date().toLocaleString()}`
        };

        console.log('Creating schedule with data:', scheduleData);

        const response = await apiCall(`/classes/${firstClass.id}/schedules`, {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });

        document.getElementById('scheduleDemo').innerHTML = `
            <div class="success">✅ Schedule created for class "${firstClass.name}" on ${response.data.date}</div>
            <div style="margin-top: 10px;">
                <button class="btn btn-secondary" onclick="loadAllSchedulesDemo()">View All Schedules</button>
                <button class="btn" onclick="testScheduleAPIs()">Test All Schedule APIs</button>
            </div>
        `;
    } catch (error) {
        console.error('Create schedule error:', error);
        document.getElementById('scheduleDemo').innerHTML = `
            <div class="error">❌ Failed: ${error.message}</div>
            <div style="margin-top: 10px;">
                <button class="btn btn-secondary" onclick="testScheduleAPIs()">Test Schedule APIs</button>
            </div>
        `;
    }
}

/**
 * Create today's schedules for testing
 * @returns {Promise<void>}
 */
async function createTodaySchedules() {
    try {
        if (!authToken) {
            throw new Error('Please login first');
        }

        document.getElementById('authDemo').innerHTML = '<div class="info">🔄 Creating today\'s schedules...</div>';

        // Get available classes
        const classesResponse = await apiCall('/classes');
        if (!classesResponse.success || !classesResponse.data.classes || classesResponse.data.classes.length === 0) {
            throw new Error('No classes available.');
        }

        // Get current user info
        const userResponse = await apiCall('/auth/me');
        if (!userResponse.success) {
            throw new Error('Cannot get current user info.');
        }

        const classes = classesResponse.data.classes.slice(0, 3); // Use first 3 classes
        const results = [];
        let created = 0;

        for (let i = 0; i < classes.length; i++) {
            try {
                const cls = classes[i];
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1); // Tomorrow
                
                // Create schedule for tomorrow morning/afternoon
                const startTime = new Date(tomorrow);
                startTime.setHours(9 + i * 2, 0, 0, 0); // 9AM, 11AM, 1PM
                
                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + (cls.duration || 60));

                const scheduleData = {
                    date: tomorrow.toISOString().split('T')[0],
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    trainerId: userResponse.data.id,
                    maxParticipants: cls.maxParticipants || 20,
                    room: cls.room || 'Demo Studio',
                    notes: `Tomorrow's demo schedule - ${cls.name}`
                };

                const response = await apiCall(`/classes/${cls.id}/schedules`, {
                    method: 'POST',
                    body: JSON.stringify(scheduleData)
                });

                if (response.success) {
                    created++;
                    results.push(`✅ ${cls.name} at ${startTime.getHours()}:00 (tomorrow)`);
                }
            } catch (error) {
                results.push(`❌ Failed to create schedule: ${error.message}`);
            }
        }

        document.getElementById('authDemo').innerHTML = `
            <div class="success">
                ✅ Created ${created}/${classes.length} schedules for tomorrow<br>
                ${results.join('<br>')}
                <br><small>Now you can test enrollment!</small>
            </div>
        `;

    } catch (error) {
        document.getElementById('authDemo').innerHTML = `
            <div class="error">❌ Error: ${error.message}</div>
        `;
    }
}

/**
 * Enroll in schedule
 * @param {number} scheduleId - Schedule ID to enroll in
 * @returns {Promise<void>}
 */
async function enrollInSchedule(scheduleId) {
    try {
        if (!authToken) {
            alert('Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }
        
        const response = await apiCall(`/classes/schedules/${scheduleId}/enroll`, {
            method: 'POST'
        });
        
        if (response.success) {
            alert('✅ Đăng ký thành công!');
            loadSchedules(); // Reload to update participant count
        } else {
            alert('❌ Đăng ký thất bại: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        alert('❌ Lỗi đăng ký: ' + error.message);
    }
}

/**
 * View schedule detail
 * @param {number} scheduleId - Schedule ID to view
 * @returns {Promise<void>}
 */
async function viewScheduleDetail(scheduleId) {
    try {
        const response = await apiCall(`/classes/schedules/${scheduleId}`);
        if (response.success) {
            const schedule = response.data;
            const classType = schedule.class?.classType?.name || 'N/A';
            const price = schedule.class?.price ? schedule.class.price.toLocaleString('vi-VN') + ' VND' : 'Miễn phí';
            alert(`Chi tiết lịch #${schedule.id}:
Lớp: ${schedule.class?.name || 'N/A'}
Loại lớp: ${classType}
Ngày: ${schedule.date}
Thời gian: ${new Date(schedule.startTime).toLocaleTimeString('vi-VN')} - ${new Date(schedule.endTime).toLocaleTimeString('vi-VN')}
Phòng: ${schedule.room || 'N/A'}
Huấn luyện viên: ${schedule.trainer?.fullName || 'N/A'}
Học viên: ${schedule.currentParticipants}/${schedule.maxParticipants}
Trạng thái: ${schedule.status}
Giá: ${price}
Ghi chú: ${schedule.notes || 'Không có'}`);
        }
    } catch (error) {
        alert('Lỗi: ' + error.message);
    }
}

/**
 * Delete schedule
 * @param {number} scheduleId - Schedule ID to delete
 * @param {string} className - Class name for confirmation
 * @returns {Promise<void>}
 */
async function deleteSchedule(scheduleId, className) {
    try {
        if (!authToken) {
            alert('Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }
        
        const confirmed = confirm(`Bạn có chắc muốn xóa lịch lớp "${className}" (ID: ${scheduleId})?\n\nĐiều này sẽ:\n- Hủy tất cả đăng ký của lớp này\n- Không thể hoàn tác`);
        if (!confirmed) {
            return;
        }
        
        const response = await apiCall(`/classes/schedules/${scheduleId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            alert('✅ Xóa lịch thành công!');
            // Reload schedules if loadSchedules function exists
            if (typeof loadSchedules === 'function') {
                loadSchedules();
            }
        } else {
            alert('❌ Xóa lịch thất bại: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        alert('❌ Lỗi xóa lịch: ' + error.message);
    }
}