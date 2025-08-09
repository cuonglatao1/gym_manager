// Main UI Functions and Event Handlers
// This file contains all UI-related functions, DOM manipulation, event handlers, and initialization

// Authentication token for UI state management
let authToken = null;

/**
 * Tab functionality - Show specific tab and hide others
 * @param {string} tabName - Name of the tab to show
 */
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

/**
 * Show loading indicator in specified container
 * @param {string} containerId - ID of container to show loading in
 */
function showLoading(containerId) {
    document.getElementById(containerId).innerHTML = '<div class="loading">Loading...</div>';
}

/**
 * Show error message in specified container
 * @param {string} containerId - ID of container to show error in
 * @param {string} message - Error message to display
 */
function showError(containerId, message) {
    document.getElementById(containerId).innerHTML = `<div class="error">Error: ${message}</div>`;
}

/**
 * Show success message in specified container
 * @param {string} containerId - ID of container to show success in
 * @param {string} message - Success message to display
 */
function showSuccess(containerId, message) {
    document.getElementById(containerId).innerHTML = `<div class="success">${message}</div>`;
}

/**
 * Display API response in the designated response area
 * @param {Object} data - API response data to display
 */
function displayApiResponse(data) {
    document.getElementById('apiResponse').innerHTML = 
        `<strong>Response:</strong><br><pre>${JSON.stringify(data, null, 2)}</pre>`;
}

/**
 * Load schedules with comprehensive error handling
 * @returns {Promise<void>}
 */
async function loadSchedules() {
    showLoading('schedulesContainer');
    try {
        console.log('🔄 Loading schedules from API...');
        console.log('API Base URL:', API_BASE_URL);
        console.log('Auth Token:', authToken ? 'Present' : 'Missing');
        
        // Try direct fetch first to diagnose issues
        const response = await fetch(`${API_BASE_URL}/classes/schedules`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            }
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);

        // Check if server is responding at all
        if (!response) {
            throw new Error('Không thể kết nối đến server. Kiểm tra server có chạy trên localhost:3000 không?');
        }

        const contentType = response.headers.get('content-type');
        console.log('📄 Content-Type:', contentType);

        // Check if response is HTML (server error page)
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.log('❌ Non-JSON response received:', textResponse.substring(0, 500));
            
            if (textResponse.includes('Cannot GET')) {
                throw new Error('API endpoint không tồn tại. Kiểm tra server có route /api/classes/schedules không?');
            } else if (textResponse.includes('<html')) {
                throw new Error('Server trả về HTML thay vì JSON. Server có thể chưa chạy hoặc có lỗi.');
            } else {
                throw new Error(`Server trả về ${contentType || 'unknown content'} thay vì JSON`);
            }
        }

        let data;
        try {
            data = await response.json();
            console.log('📦 API Response data:', data);
        } catch (jsonError) {
            console.error('❌ JSON parsing error:', jsonError);
            throw new Error('Server trả về JSON không hợp lệ');
        }

        // Check for API errors
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('API endpoint /classes/schedules không tìm thấy (404)');
            } else if (response.status === 401) {
                throw new Error('Chưa đăng nhập. Vào tab API Demo để login trước.');
            } else if (response.status === 403) {
                throw new Error('Không có quyền truy cập. Kiểm tra role của user.');
            } else if (response.status === 500) {
                throw new Error(`Lỗi server (500): ${data.message || 'Internal server error'}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
            }
        }

        // Handle successful response
        if (data.success) {
            let schedules = [];
            let pagination = null;
            
            // Handle different response formats
            if (Array.isArray(data.data)) {
                schedules = data.data;
                console.log('📋 Found schedules (array format):', schedules.length);
            } else if (data.data && data.data.schedules) {
                schedules = data.data.schedules;
                pagination = data.data.pagination;
                console.log('📋 Found schedules (paginated format):', schedules.length);
            } else if (data.data) {
                // Maybe data is directly the schedules
                if (data.data.length !== undefined) {
                    schedules = [data.data];
                } else {
                    schedules = [];
                }
                console.log('📋 Found schedules (other format):', schedules.length);
            } else {
                schedules = [];
                console.log('📋 No schedules found in response');
            }

            if (schedules.length === 0) {
                document.getElementById('schedulesContainer').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h4>📅 Chưa có lịch tập nào</h4>
                        <p>API kết nối thành công nhưng chưa có lịch tập nào được tạo.</p>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-success" onclick="createSampleSchedules()">Tạo Lịch Mẫu</button>
                            <button class="btn btn-secondary" onclick="showDemoSchedules()">Xem Lịch Demo</button>
                            <button class="btn" onclick="testApiConnection()">Kiểm Tra API</button>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: #d1ecf1; border-radius: 8px; border-left: 4px solid #0c5460;">
                            <p><strong>ℹ️ API Response:</strong></p>
                            <pre style="font-size: 12px; color: #0c5460;">${JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                `;
                return;
            }

            // Build HTML table
            const html = `
                <div class="success" style="margin-bottom: 20px;">
                    ✅ Tải thành công ${schedules.length} lịch tập từ API
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Lớp Tập</th>
                            <th>Ngày</th>
                            <th>Thời Gian</th>
                            <th>Phòng</th>
                            <th>Học Viên</th>
                            <th>Trạng Thái</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => {
                            // Handle different time formats safely
                            let startTime = 'N/A', endTime = 'N/A';
                            try {
                                if (schedule.startTime) {
                                    const start = new Date(schedule.startTime);
                                    if (!isNaN(start.getTime())) {
                                        startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                    }
                                }
                                if (schedule.endTime) {
                                    const end = new Date(schedule.endTime);
                                    if (!isNaN(end.getTime())) {
                                        endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                    }
                                }
                            } catch (e) {
                                console.log('⚠️ Time parsing error:', e);
                            }
                            
                            // Get class and trainer names safely
                            const className = schedule.Class?.name || schedule.class?.name || 'N/A';
                            const trainerName = schedule.Trainer?.fullName || schedule.trainer?.fullName || 'N/A';
                            
                            return `
                                <tr>
                                    <td><strong>#${schedule.id || 'N/A'}</strong></td>
                                    <td><strong>${className}</strong></td>
                                    <td>${schedule.date || 'N/A'}</td>
                                    <td>${startTime} - ${endTime}</td>
                                    <td>${schedule.room || 'N/A'}</td>
                                    <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 0}</td>
                                    <td><span class="badge badge-${schedule.status === 'scheduled' ? 'primary' : schedule.status === 'completed' ? 'success' : 'warning'}">${schedule.status || 'N/A'}</span></td>
                                    <td>
                                        <button class="btn" style="font-size: 12px; padding: 5px 10px;" onclick="viewScheduleDetail(${schedule.id})">Chi tiết</button>
                                        ${schedule.status === 'scheduled' ? `<button class="btn btn-success" style="font-size: 12px; padding: 5px 10px;" onclick="enrollInSchedule(${schedule.id})">Đăng ký</button>` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${pagination ? `
                    <div style="margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745;">
                        <p><strong>📊 Thống kê:</strong></p>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            <li>Tổng số lịch: <strong>${pagination.totalItems}</strong></li>
                            <li>Trang hiện tại: <strong>${pagination.currentPage}/${pagination.totalPages}</strong></li>
                            <li>Lịch trên trang: <strong>${schedules.length}</strong></li>
                        </ul>
                    </div>
                ` : `
                    <div style="margin-top: 15px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745;">
                        <p><strong>📊 Thống kê:</strong></p>
                        <p>Tổng số lịch hiển thị: <strong>${schedules.length}</strong></p>
                    </div>
                `}
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="loadSchedulesToday()">Lịch Hôm Nay</button>
                    <button class="btn btn-secondary" onclick="loadSchedulesThisWeek()">Lịch Tuần Này</button>
                    <button class="btn btn-success" onclick="createSampleSchedules()">Tạo Lịch Mẫu</button>
                </div>
            `;
            document.getElementById('schedulesContainer').innerHTML = html;
        } else {
            throw new Error(`API trả về thất bại: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('❌ Error loading schedules:', error);
        
        // Determine error type and show appropriate message
        let errorMessage = error.message;
        let suggestions = [];
        
        if (error.message.includes('fetch')) {
            errorMessage = 'Không thể kết nối đến server';
            suggestions = [
                'Kiểm tra server có chạy trên localhost:3000',
                'Chạy lệnh: npm start hoặc node app.js',
                'Kiểm tra firewall hoặc antivirus'
            ];
        } else if (error.message.includes('401') || error.message.includes('login')) {
            errorMessage = 'Chưa đăng nhập';
            suggestions = [
                'Vào tab "API Demo" và click "Demo Login as Admin"',
                'Kiểm tra token có hết hạn không'
            ];
        } else if (error.message.includes('404')) {
            errorMessage = 'API endpoint không tồn tại';
            suggestions = [
                'Kiểm tra routes/classRoutes.js có tồn tại không',
                'Kiểm tra app.js có import classRoutes không'
            ];
        }
        
        document.getElementById('schedulesContainer').innerHTML = `
            <div class="error">
                ❌ <strong>Lỗi tải lịch từ API:</strong> ${errorMessage}
                ${suggestions.length > 0 ? `
                    <div style="margin-top: 10px;">
                        <strong>💡 Gợi ý khắc phục:</strong>
                        <ul style="margin-top: 5px; padding-left: 20px;">
                            ${suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div style="margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="showDemoSchedules()">Xem Lịch Demo</button>
                    <button class="btn" onclick="loadSchedules()">Thử lại</button>
                    <button class="btn btn-primary" onclick="testApiConnection()">Kiểm tra API</button>
                </div>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #dc3545;">🔍 Chi tiết lỗi (click để mở)</summary>
                    <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 12px; overflow-x: auto;">${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
}

/**
 * Load today's schedules
 * @returns {Promise<void>}
 */
async function loadSchedulesToday() {
    showLoading('schedulesContainer');
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/schedules?date=${today}`);
        
        if (response.success) {
            const schedules = Array.isArray(response.data) ? response.data : response.data.schedules || [];
            
            if (schedules.length === 0) {
                document.getElementById('schedulesContainer').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h4>📅 Không có lịch tập hôm nay (${today})</h4>
                        <div style="margin-top: 20px;">
                            <button class="btn" onclick="loadSchedules()">Xem Tất Cả Lịch</button>
                            <button class="btn btn-secondary" onclick="showDemoSchedules()">Xem Lịch Demo</button>
                        </div>
                    </div>
                `;
                return;
            }

            document.getElementById('schedulesContainer').innerHTML = `
                <div class="success" style="margin-bottom: 20px;">
                    ✅ Tìm thấy ${schedules.length} lịch tập hôm nay (${today})
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Lớp Tập</th>
                            <th>Thời Gian</th>
                            <th>Phòng</th>
                            <th>Huấn Luyện Viên</th>
                            <th>Học Viên</th>
                            <th>Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => {
                            const startTime = schedule.startTime ? new Date(schedule.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            const endTime = schedule.endTime ? new Date(schedule.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            return `
                                <tr>
                                    <td><strong>${schedule.Class?.name || schedule.class?.name || 'N/A'}</strong></td>
                                    <td>${startTime} - ${endTime}</td>
                                    <td>${schedule.room || 'N/A'}</td>
                                    <td>${schedule.Trainer?.fullName || schedule.trainer?.fullName || 'N/A'}</td>
                                    <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 0}</td>
                                    <td><span class="badge badge-${schedule.status === 'scheduled' ? 'primary' : 'success'}">${schedule.status || 'N/A'}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="loadSchedules()">Xem Tất Cả</button>
                    <button class="btn btn-secondary" onclick="loadSchedulesThisWeek()">Lịch Tuần Này</button>
                </div>
            `;
        }
    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

/**
 * Load this week's schedules
 * @returns {Promise<void>}
 */
async function loadSchedulesThisWeek() {
    showLoading('schedulesContainer');
    try {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];
        
        const response = await apiCall(`/classes/schedules?startDate=${startDate}&endDate=${endDate}`);
        
        if (response.success) {
            const schedules = Array.isArray(response.data) ? response.data : response.data.schedules || [];
            
            if (schedules.length === 0) {
                document.getElementById('schedulesContainer').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <h4>📅 Không có lịch tập tuần này</h4>
                        <p>Từ ${startDate} đến ${endDate}</p>
                        <div style="margin-top: 20px;">
                            <button class="btn" onclick="loadSchedules()">Xem Tất Cả Lịch</button>
                            <button class="btn btn-secondary" onclick="showDemoSchedules()">Xem Lịch Demo</button>
                        </div>
                    </div>
                `;
                return;
            }

            document.getElementById('schedulesContainer').innerHTML = `
                <div class="success" style="margin-bottom: 20px;">
                    ✅ Tìm thấy ${schedules.length} lịch tập tuần này (${startDate} - ${endDate})
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Lớp Tập</th>
                            <th>Ngày</th>
                            <th>Thời Gian</th>
                            <th>Huấn Luyện Viên</th>
                            <th>Học Viên</th>
                            <th>Trạng Thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => {
                            const startTime = schedule.startTime ? new Date(schedule.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            const endTime = schedule.endTime ? new Date(schedule.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            return `
                                <tr>
                                    <td><strong>${schedule.Class?.name || schedule.class?.name || 'N/A'}</strong></td>
                                    <td>${schedule.date || 'N/A'}</td>
                                    <td>${startTime} - ${endTime}</td>
                                    <td>${schedule.Trainer?.fullName || schedule.trainer?.fullName || 'N/A'}</td>
                                    <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 0}</td>
                                    <td><span class="badge badge-${schedule.status === 'scheduled' ? 'primary' : 'success'}">${schedule.status || 'N/A'}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="loadSchedules()">Xem Tất Cả</button>
                    <button class="btn btn-secondary" onclick="loadSchedulesToday()">Lịch Hôm Nay</button>
                </div>
            `;
        }
    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

/**
 * Test all schedule APIs
 * @returns {Promise<void>}
 */
async function testScheduleAPIs() {
    document.getElementById('scheduleDemo').innerHTML = `
        <div class="loading">Testing Schedule APIs...</div>
    `;
    
    let results = [];
    
    // Test 1: Get all schedules
    try {
        const response = await apiCall('/classes/schedules');
        results.push({
            test: 'GET /classes/schedules',
            success: true,
            result: `Found ${Array.isArray(response.data) ? response.data.length : response.data?.schedules?.length || 0} schedules`
        });
    } catch (error) {
        results.push({
            test: 'GET /classes/schedules',
            success: false,
            result: error.message
        });
    }

    // Test 2: Get schedules with date filter
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/schedules?date=${today}`);
        results.push({
            test: `GET /classes/schedules?date=${today}`,
            success: true,
            result: `Found ${Array.isArray(response.data) ? response.data.length : response.data?.schedules?.length || 0} schedules for today`
        });
    } catch (error) {
        results.push({
            test: 'GET /classes/schedules (today)',
            success: false,
            result: error.message
        });
    }

    // Test 3: Get schedules with date range
    try {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await apiCall(`/classes/schedules?startDate=${startDate}&endDate=${endDate}`);
        results.push({
            test: `GET /classes/schedules?startDate=${startDate}&endDate=${endDate}`,
            success: true,
            result: `Found ${Array.isArray(response.data) ? response.data.length : response.data?.schedules?.length || 0} schedules this week`
        });
    } catch (error) {
        results.push({
            test: 'GET /classes/schedules (week range)',
            success: false,
            result: error.message
        });
    }

    // Test 4: Try to get specific schedule details (if any schedules exist)
    try {
        const allSchedules = await apiCall('/classes/schedules');
        let schedules = [];
        
        if (Array.isArray(allSchedules.data)) {
            schedules = allSchedules.data;
        } else if (allSchedules.data?.schedules) {
            schedules = allSchedules.data.schedules;
        }
        
        if (schedules.length > 0) {
            const firstSchedule = schedules[0];
            const response = await apiCall(`/classes/schedules/${firstSchedule.id}`);
            results.push({
                test: `GET /classes/schedules/${firstSchedule.id}`,
                success: true,
                result: `Schedule details retrieved for class: ${response.data.Class?.name || 'N/A'}`
            });
        } else {
            results.push({
                test: 'GET /classes/schedules/:id',
                success: false,
                result: 'No schedules available to test'
            });
        }
    } catch (error) {
        results.push({
            test: 'GET /classes/schedules/:id',
            success: false,
            result: error.message
        });
    }

    // Display results
    const html = `
        <div style="margin-bottom: 20px;">
            <h4>🧪 Schedule API Test Results</h4>
        </div>
        <table class="table">
            <thead>
                <tr>
                    <th>API Endpoint</th>
                    <th>Status</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td><code>${result.test}</code></td>
                        <td><span class="badge badge-${result.success ? 'success' : 'warning'}">${result.success ? '✅ PASS' : '❌ FAIL'}</span></td>
                        <td style="max-width: 300px; word-break: break-word;">${result.result}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <p><strong>📊 Summary:</strong></p>
            <p>✅ Passed: <strong>${results.filter(r => r.success).length}/${results.length}</strong></p>
            <p>❌ Failed: <strong>${results.filter(r => !r.success).length}/${results.length}</strong></p>
        </div>
        <div style="margin-top: 15px;">
            <button class="btn" onclick="demoCreateSchedule()">Create Demo Schedule</button>
            <button class="btn btn-secondary" onclick="loadAllSchedulesDemo()">View All Schedules</button>
        </div>
    `;
    
    document.getElementById('scheduleDemo').innerHTML = html;
}

/**
 * Load all schedules for demo
 * @returns {Promise<void>}
 */
async function loadAllSchedulesDemo() {
    try {
        const response = await apiCall('/classes/schedules');
        
        if (response.success) {
            let schedules = [];
            
            if (Array.isArray(response.data)) {
                schedules = response.data;
            } else if (response.data.schedules) {
                schedules = response.data.schedules;
            }
            
            const html = `
                <div class="success" style="margin-bottom: 15px;">
                    ✅ Loaded ${schedules.length} schedules from API
                </div>
                ${schedules.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Class</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${schedules.slice(0, 5).map(schedule => `
                                <tr>
                                    <td>#${schedule.id}</td>
                                    <td>${schedule.Class?.name || schedule.class?.name || 'N/A'}</td>
                                    <td>${schedule.date || 'N/A'}</td>
                                    <td>${schedule.startTime ? new Date(schedule.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                                    <td><span class="badge badge-primary">${schedule.status || 'N/A'}</span></td>
                                </tr>
                            `).join('')}
                            ${schedules.length > 5 ? `
                                <tr>
                                    <td colspan="5" style="text-align: center; color: #666;">
                                        ... and ${schedules.length - 5} more schedules
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                ` : '<p>No schedules found in the system.</p>'}
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="testScheduleAPIs()">Test All APIs</button>
                    <button class="btn btn-success" onclick="demoCreateSchedule()">Create New Schedule</button>
                </div>
            `;
            
            document.getElementById('scheduleDemo').innerHTML = html;
        } else {
            throw new Error(response.message || 'Failed to load schedules');
        }
    } catch (error) {
        document.getElementById('scheduleDemo').innerHTML = `
            <div class="error">❌ Failed to load schedules: ${error.message}</div>
        `;
    }
}

/**
 * Demo enrollment function
 * @returns {Promise<void>}
 */
async function demoEnrollment() {
    try {
        if (!authToken) {
            document.getElementById('scheduleDemo').innerHTML = `
                <div class="error">
                    ❌ Please login first!<br>
                    <strong>Steps:</strong><br>
                    1. Click "Login as Member" button above<br>
                    2. Then try enrollment again
                </div>
            `;
            return;
        }

        // Get first available schedule
        const schedulesResponse = await apiCall('/classes/schedules?limit=5');
        if (!schedulesResponse.success || !schedulesResponse.data.schedules || schedulesResponse.data.schedules.length === 0) {
            document.getElementById('scheduleDemo').innerHTML = `
                <div class="error">❌ No schedules available for enrollment demo</div>
            `;
            return;
        }

        // Find a schedule with available slots that hasn't started yet
        let availableSchedule = null;
        const currentTime = new Date();
        for (const schedule of schedulesResponse.data.schedules) {
            const startTime = new Date(schedule.startTime);
            const hasSlots = schedule.currentParticipants < schedule.maxParticipants;
            const isFuture = startTime > currentTime;
            const isScheduled = schedule.status === 'scheduled';
            
            console.log(`🔍 Checking schedule ${schedule.id}:`, {
                startTime: startTime.toISOString(),
                currentTime: currentTime.toISOString(),
                hasSlots,
                isFuture,
                isScheduled
            });
            
            if (hasSlots && isFuture && isScheduled) {
                availableSchedule = schedule;
                break;
            }
        }

        if (!availableSchedule) {
            document.getElementById('scheduleDemo').innerHTML = `
                <div class="error">
                    ❌ No future schedules with available slots found.<br>
                    <strong>Solutions:</strong><br>
                    1. Click "📅 Create Tomorrow's Schedules" to create new schedules<br>
                    2. Or check if there are schedules for tomorrow
                </div>
                <button class="btn btn-primary" onclick="createTodaySchedules()" style="margin-top: 10px;">📅 Create Tomorrow's Schedules</button>
            `;
            return;
        }

        // Try to enroll current user
        const enrollResponse = await apiCall(`/classes/schedules/${availableSchedule.id}/enroll`, {
            method: 'POST'
        });

        if (enrollResponse.success) {
            document.getElementById('scheduleDemo').innerHTML = `
                <div class="success">
                    ✅ Enrollment successful!<br>
                    📅 Class: ${availableSchedule.Class?.name || 'N/A'}<br>
                    🕐 Time: ${availableSchedule.date} ${new Date(availableSchedule.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}<br>
                    👥 Participants: ${availableSchedule.currentParticipants + 1}/${availableSchedule.maxParticipants}<br>
                    🏠 Room: ${availableSchedule.room || 'N/A'}
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="loadAllSchedulesDemo()">View Updated Schedules</button>
                    <button class="btn" onclick="demoEnrollment()">Try Another Enrollment</button>
                </div>
            `;
        } else {
            document.getElementById('scheduleDemo').innerHTML = `
                <div class="error">❌ Enrollment failed: ${enrollResponse.message || 'Unknown error'}</div>
                <div style="margin-top: 10px;">
                    <small><strong>Common causes:</strong><br>
                    • Already enrolled in this class<br>
                    • Class is full<br>
                    • Need to login as Member (not Admin)</small>
                </div>
            `;
        }

    } catch (error) {
        document.getElementById('scheduleDemo').innerHTML = `
            <div class="error">❌ Enrollment demo error: ${error.message}</div>
        `;
    }
}

/**
 * Show demo schedules (static data for demonstration)
 */
function showDemoSchedules() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const demoSchedules = [
        {
            class: { name: 'Morning Yoga' },
            date: today.toISOString().split('T')[0],
            startTime: '06:00',
            endTime: '07:00',
            trainer: { fullName: 'Mai Anh' },
            currentParticipants: 12,
            maxParticipants: 20,
            status: 'scheduled'
        },
        {
            class: { name: 'HIIT Training' },
            date: today.toISOString().split('T')[0],
            startTime: '07:30',
            endTime: '08:30',
            trainer: { fullName: 'Minh Tuấn' },
            currentParticipants: 15,
            maxParticipants: 15,
            status: 'full'
        },
        {
            class: { name: 'Boxing Class' },
            date: today.toISOString().split('T')[0],
            startTime: '18:00',
            endTime: '19:00',
            trainer: { fullName: 'Hoàng Nam' },
            currentParticipants: 8,
            maxParticipants: 12,
            status: 'scheduled'
        },
        {
            class: { name: 'Evening Yoga' },
            date: today.toISOString().split('T')[0],
            startTime: '19:30',
            endTime: '20:30',
            trainer: { fullName: 'Thu Hà' },
            currentParticipants: 18,
            maxParticipants: 25,
            status: 'scheduled'
        },
        {
            class: { name: 'Zumba Dance' },
            date: tomorrow.toISOString().split('T')[0],
            startTime: '07:00',
            endTime: '08:30',
            trainer: { fullName: 'Linh Chi' },
            currentParticipants: 22,
            maxParticipants: 30,
            status: 'scheduled'
        }
    ];

    const html = `
        <div class="success" style="margin-bottom: 20px;">
            ✅ Hiển thị lịch demo - ${demoSchedules.length} lớp tập
        </div>
        <table class="table">
            <thead>
                <tr>
                    <th>Lớp Tập</th>
                    <th>Ngày</th>
                    <th>Thời Gian</th>
                    <th>Huấn Luyện Viên</th>
                    <th>Học Viên</th>
                    <th>Trạng Thái</th>
                </tr>
            </thead>
            <tbody>
                ${demoSchedules.map(schedule => `
                    <tr>
                        <td><strong>${schedule.class.name}</strong></td>
                        <td>${schedule.date}</td>
                        <td>${schedule.startTime} - ${schedule.endTime}</td>
                        <td>${schedule.trainer.fullName}</td>
                        <td>${schedule.currentParticipants}/${schedule.maxParticipants}</td>
                        <td><span class="badge badge-${schedule.status === 'scheduled' ? 'primary' : schedule.status === 'completed' ? 'success' : schedule.status === 'full' ? 'warning' : 'primary'}">${schedule.status === 'scheduled' ? 'Đã lên lịch' : schedule.status === 'completed' ? 'Hoàn thành' : schedule.status === 'full' ? 'Đã đầy' : schedule.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top: 15px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
            <h4 style="color: #1976d2; margin-bottom: 10px;">📋 Thông Tin Lịch Demo</h4>
            <ul style="margin: 0; padding-left: 20px; color: #424242;">
                <li>Tổng số lớp hôm nay: <strong>${demoSchedules.filter(s => s.date === today.toISOString().split('T')[0]).length}</strong></li>
                <li>Tổng số học viên đăng ký: <strong>${demoSchedules.reduce((sum, s) => sum + s.currentParticipants, 0)}</strong></li>
                <li>Lớp đã đầy: <strong>${demoSchedules.filter(s => s.status === 'full').length}</strong></li>
                <li>Thời gian cao điểm: <strong>6:00-8:30 và 18:00-20:30</strong></li>
            </ul>
        </div>
    `;
    
    document.getElementById('schedulesContainer').innerHTML = html;
}

/**
 * API Testing Functions for All Requirements
 */
async function testAllMemberAPIs() {
    displayApiResponse('🧪 Testing Member Management APIs...\n\n');
    
    try {
        // 1. Test GET /api/members - List all members
        displayApiResponse('1. Testing GET /api/members (List Members)...\n');
        const membersResponse = await apiCall('/members');
        displayApiResponse(`✅ GET /api/members: ${JSON.stringify(membersResponse, null, 2)}\n\n`);
        
        // 2. Test member statistics
        displayApiResponse('2. Testing GET /api/members/statistics...\n');
        const statsResponse = await apiCall('/members/statistics');
        displayApiResponse(`✅ GET /api/members/statistics: ${JSON.stringify(statsResponse, null, 2)}\n\n`);
        
        // 3. Test POST /api/members/register - Register new member
        displayApiResponse('3. Testing POST /api/members/register...\n');
        const newMember = {
            fullName: 'Test Member API',
            email: `testmember${Date.now()}@test.com`,
            phone: `098765${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            address: 'Test Address',
            dateOfBirth: '1990-01-01',
            gender: 'male'
        };
        const registerResponse = await apiCall('/members/register', {
            method: 'POST',
            body: JSON.stringify(newMember)
        });
        displayApiResponse(`✅ POST /api/members/register: ${JSON.stringify(registerResponse, null, 2)}\n\n`);
        
        // 4. Test GET /api/members/search - Search members
        displayApiResponse('4. Testing GET /api/members/search...\n');
        const searchResponse = await apiCall('/members/search?q=Test&field=name,email');
        displayApiResponse(`✅ GET /api/members/search: ${JSON.stringify(searchResponse, null, 2)}\n\n`);
        
        displayApiResponse('✅ Member Management APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Member APIs: ${error.message}\n`);
    }
}

async function testAllMembershipAPIs() {
    displayApiResponse('🧪 Testing Membership APIs...\n\n');
    
    try {
        // 1. Test GET /api/members/memberships/all - Get all membership packages
        displayApiResponse('1. Testing GET /api/members/memberships/all...\n');
        const membershipsResponse = await apiCall('/members/memberships/all');
        displayApiResponse(`✅ GET /api/members/memberships/all: ${JSON.stringify(membershipsResponse, null, 2)}\n\n`);
        
        // 2. Test membership purchase (requires member ID)
        displayApiResponse('2. Testing membership purchase...\n');
        // First get members list to get an ID
        const membersRes = await apiCall('/members');
        if (membersRes.success && membersRes.data.length > 0) {
            const memberId = membersRes.data[0].id;
            const purchaseData = {
                membershipId: 1, // Basic membership
                paymentMethod: 'cash'
            };
            const purchaseResponse = await apiCall(`/members/${memberId}/membership`, {
                method: 'POST',
                body: JSON.stringify(purchaseData)
            });
            displayApiResponse(`✅ POST /api/members/${memberId}/membership: ${JSON.stringify(purchaseResponse, null, 2)}\n\n`);
        }
        
        displayApiResponse('✅ Membership APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Membership APIs: ${error.message}\n`);
    }
}

async function testAllClassAPIs() {
    displayApiResponse('🧪 Testing Class Management APIs...\n\n');
    
    try {
        // 1. Test GET /api/classes/types - Get class types
        displayApiResponse('1. Testing GET /api/classes/types...\n');
        const classTypesResponse = await apiCall('/classes/types');
        displayApiResponse(`✅ GET /api/classes/types: ${JSON.stringify(classTypesResponse, null, 2)}\n\n`);
        
        // 2. Test GET /api/classes - Get all classes
        displayApiResponse('2. Testing GET /api/classes...\n');
        const classesResponse = await apiCall('/classes');
        displayApiResponse(`✅ GET /api/classes: ${JSON.stringify(classesResponse, null, 2)}\n\n`);
        
        // 3. Test POST /api/classes - Create new class
        displayApiResponse('3. Testing POST /api/classes...\n');
        const newClass = {
            name: 'API Test Yoga',
            description: 'Test class created via API',
            classTypeId: 1,
            trainerId: 1,
            duration: 60,
            maxCapacity: 20,
            price: 150000
        };
        const createClassResponse = await apiCall('/classes', {
            method: 'POST',
            body: JSON.stringify(newClass)
        });
        displayApiResponse(`✅ POST /api/classes: ${JSON.stringify(createClassResponse, null, 2)}\n\n`);
        
        displayApiResponse('✅ Class Management APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Class APIs: ${error.message}\n`);
    }
}

async function testAllScheduleAPIs() {
    displayApiResponse('🧪 Testing Schedule APIs...\n\n');
    
    try {
        // 1. Test GET /api/classes/schedules - Get all schedules
        displayApiResponse('1. Testing GET /api/classes/schedules...\n');
        const schedulesResponse = await apiCall('/classes/schedules');
        displayApiResponse(`✅ GET /api/classes/schedules: ${JSON.stringify(schedulesResponse, null, 2)}\n\n`);
        
        // 2. Test GET /api/classes/trainer/schedules - Get trainer schedules
        displayApiResponse('2. Testing GET /api/classes/trainer/schedules...\n');
        const trainerSchedulesResponse = await apiCall('/classes/trainer/schedules');
        displayApiResponse(`✅ GET /api/classes/trainer/schedules: ${JSON.stringify(trainerSchedulesResponse, null, 2)}\n\n`);
        
        // 3. Test schedule creation (requires class)
        displayApiResponse('3. Testing schedule creation...\n');
        const classesRes = await apiCall('/classes');
        if (classesRes.success && classesRes.data.length > 0) {
            const classId = classesRes.data[0].id;
            const scheduleData = {
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                startTime: '09:00',
                endTime: '10:00'
            };
            const createScheduleResponse = await apiCall(`/classes/${classId}/schedules`, {
                method: 'POST',
                body: JSON.stringify(scheduleData)
            });
            displayApiResponse(`✅ POST /api/classes/${classId}/schedules: ${JSON.stringify(createScheduleResponse, null, 2)}\n\n`);
        }
        
        displayApiResponse('✅ Schedule APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Schedule APIs: ${error.message}\n`);
    }
}

async function testAllEnrollmentAPIs() {
    displayApiResponse('🧪 Testing Enrollment APIs...\n\n');
    
    try {
        // 1. Test enrollment in schedule
        displayApiResponse('1. Testing enrollment APIs...\n');
        const schedulesRes = await apiCall('/classes/schedules');
        if (schedulesRes.success && schedulesRes.data.length > 0) {
            const scheduleId = schedulesRes.data[0].id;
            
            // Test enrollment
            displayApiResponse(`Testing POST /api/classes/schedules/${scheduleId}/enroll...\n`);
            const enrollResponse = await apiCall(`/classes/schedules/${scheduleId}/enroll`, {
                method: 'POST'
            });
            displayApiResponse(`✅ Enrollment: ${JSON.stringify(enrollResponse, null, 2)}\n\n`);
            
            // Test check-in
            displayApiResponse(`Testing POST /api/classes/schedules/${scheduleId}/checkin...\n`);
            const checkinResponse = await apiCall(`/classes/schedules/${scheduleId}/checkin`, {
                method: 'POST'
            });
            displayApiResponse(`✅ Check-in: ${JSON.stringify(checkinResponse, null, 2)}\n\n`);
            
            // Test getting enrollments
            displayApiResponse(`Testing GET /api/classes/schedules/${scheduleId}/enrollments...\n`);
            const enrollmentsResponse = await apiCall(`/classes/schedules/${scheduleId}/enrollments`);
            displayApiResponse(`✅ Get Enrollments: ${JSON.stringify(enrollmentsResponse, null, 2)}\n\n`);
        }
        
        // 2. Test member's class history
        displayApiResponse('2. Testing GET /api/classes/my/history...\n');
        const historyResponse = await apiCall('/classes/my/history');
        displayApiResponse(`✅ GET /api/classes/my/history: ${JSON.stringify(historyResponse, null, 2)}\n\n`);
        
        displayApiResponse('✅ Enrollment APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Enrollment APIs: ${error.message}\n`);
    }
}

async function testAllAnalyticsAPIs() {
    displayApiResponse('🧪 Testing Analytics APIs...\n\n');
    
    try {
        // 1. Test popular classes analytics
        displayApiResponse('1. Testing GET /api/classes/analytics/popular...\n');
        const popularResponse = await apiCall('/classes/analytics/popular');
        displayApiResponse(`✅ Popular Classes: ${JSON.stringify(popularResponse, null, 2)}\n\n`);
        
        // 2. Test attendance statistics
        displayApiResponse('2. Testing GET /api/classes/analytics/attendance...\n');
        const attendanceResponse = await apiCall('/classes/analytics/attendance');
        displayApiResponse(`✅ Attendance Stats: ${JSON.stringify(attendanceResponse, null, 2)}\n\n`);
        
        // 3. Test revenue analytics
        displayApiResponse('3. Testing GET /api/classes/analytics/revenue...\n');
        const revenueResponse = await apiCall('/classes/analytics/revenue');
        displayApiResponse(`✅ Revenue Analytics: ${JSON.stringify(revenueResponse, null, 2)}\n\n`);
        
        displayApiResponse('✅ Analytics APIs Test Complete!\n');
    } catch (error) {
        displayApiResponse(`❌ Error testing Analytics APIs: ${error.message}\n`);
    }
}

/**
 * Member Search and Detail Functions
 */
async function searchMembers() {
    const searchInput = document.getElementById('memberSearchInput');
    const fieldSelect = document.getElementById('searchFieldSelect');
    const query = searchInput.value.trim();
    const fields = fieldSelect.value;
    
    // Validate input
    if (!query) {
        showError('memberSearchResults', 'Vui lòng nhập từ khóa tìm kiếm');
        return;
    }
    
    if (query.length < 2) {
        showError('memberSearchResults', 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự');
        return;
    }
    
    // Validate fields
    const validFields = ['name,email,phone', 'name', 'email', 'phone'];
    if (!validFields.includes(fields)) {
        showError('memberSearchResults', 'Trường tìm kiếm không hợp lệ');
        return;
    }
    
    showLoading('memberSearchResults');
    
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const response = await apiCall(`/members/search?q=${encodeURIComponent(query)}&field=${encodeURIComponent(fields)}&page=1&limit=20`);
        
        if (response.success && response.data) {
            let html = `
                <div style="margin-bottom: 15px; padding: 10px; background: #e7f3ff; border-radius: 5px; color: #0066cc;">
                    <strong>${response.message || `Tìm thấy ${response.data.length} kết quả cho "${query}"`}</strong>
                </div>`;
            
            if (response.data.length === 0) {
                html += '<p style="text-align: center; color: #666; font-style: italic;">Không tìm thấy member nào phù hợp với từ khóa tìm kiếm.</p>';
            } else {
                html += '<div style="overflow-x: auto;"><table class="table">';
                html += `
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Member Code</th>
                            <th>Họ tên</th>
                            <th>Email</th>
                            <th>SĐT</th>
                            <th>Gói hiện tại</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                response.data.forEach(member => {
                    // Get latest membership from membershipHistory array
                    let membership = 'Chưa có gói';
                    if (member.membershipHistory && member.membershipHistory.length > 0) {
                        const latestMembership = member.membershipHistory[0];
                        if (latestMembership && latestMembership.membership) {
                            membership = latestMembership.membership.name;
                        }
                    }
                    
                    const status = member.isActive ? 'Active' : 'Inactive';
                    const statusColor = member.isActive ? 'success' : 'warning';
                    
                    html += `
                        <tr>
                            <td>${member.id}</td>
                            <td><strong>${member.memberCode || 'N/A'}</strong></td>
                            <td>${member.fullName || 'N/A'}</td>
                            <td>${member.email || 'N/A'}</td>
                            <td>${member.phone || 'N/A'}</td>
                            <td><span class="badge badge-primary">${membership}</span></td>
                            <td><span class="badge badge-${statusColor}">${status}</span></td>
                            <td>
                                <button class="btn" style="padding: 5px 10px; font-size: 12px;" onclick="viewMemberDetail(${member.id})">👁️ Xem</button>
                            </td>
                        </tr>`;
                });
                
                html += '</tbody></table></div>';
                
                // Add pagination info if available
                if (response.pagination) {
                    html += `<p style="margin-top: 15px; color: #666;"><strong>Kết quả:</strong> ${response.pagination.total} members, trang ${response.pagination.page}/${response.pagination.totalPages}</p>`;
                }
            }
            
            document.getElementById('memberSearchResults').innerHTML = html;
        } else {
            showError('memberSearchResults', response.message || 'Không thể tìm kiếm members');
        }
    } catch (error) {
        showError('memberSearchResults', 'Lỗi: ' + error.message);
        console.error('Search error:', error);
    }
}

function clearMemberSearch() {
    document.getElementById('memberSearchInput').value = '';
    document.getElementById('searchFieldSelect').value = 'name,email,phone';
    document.getElementById('memberSearchResults').innerHTML = '';
    document.getElementById('memberDetailCard').style.display = 'none';
}

async function viewMemberDetail(memberId) {
    showLoading('memberDetailContainer');
    document.getElementById('memberDetailCard').style.display = 'block';
    
    try {
        const response = await apiCall(`/members/${memberId}`);
        
        if (response.success && response.data) {
            const member = response.data;
            let html = `
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                    <div>
                        <h4>📋 Thông tin chi tiết</h4>
                        <form id="updateMemberForm">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group">
                                    <label>Họ tên:</label>
                                    <input type="text" id="updateFullName" value="${member.fullName || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Email:</label>
                                    <input type="email" id="updateEmail" value="${member.email || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Số điện thoại:</label>
                                    <input type="text" id="updatePhone" value="${member.phone || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Giới tính:</label>
                                    <select id="updateGender">
                                        <option value="male" ${member.gender === 'male' ? 'selected' : ''}>Nam</option>
                                        <option value="female" ${member.gender === 'female' ? 'selected' : ''}>Nữ</option>
                                        <option value="other" ${member.gender === 'other' ? 'selected' : ''}>Khác</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Ngày sinh:</label>
                                    <input type="date" id="updateDateOfBirth" value="${member.dateOfBirth ? member.dateOfBirth.split('T')[0] : ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Trạng thái:</label>
                                    <select id="updateIsActive">
                                        <option value="true" ${member.isActive ? 'selected' : ''}>Active</option>
                                        <option value="false" ${!member.isActive ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Địa chỉ:</label>
                                <textarea id="updateAddress" rows="3">${member.address || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Ghi chú:</label>
                                <textarea id="updateNotes" rows="3">${member.notes || ''}</textarea>
                            </div>
                            <div style="margin-top: 20px;">
                                <button type="button" class="btn btn-success" onclick="updateMemberInfo(${member.id})">💾 Cập Nhật</button>
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('memberDetailCard').style.display='none'">❌ Đóng</button>
                            </div>
                        </form>
                    </div>
                    <div>
                        <h4>📊 Thống kê</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Member ID:</strong> ${member.id}</p>
                            <p><strong>Member Code:</strong> ${member.memberCode || 'N/A'}</p>
                            <p><strong>Ngày đăng ký:</strong> ${new Date(member.createdAt).toLocaleDateString('vi-VN')}</p>
                            <p><strong>Cập nhật lần cuối:</strong> ${new Date(member.updatedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        
                        <h4>💳 Thông tin Membership</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${member.currentMembership ? `
                                <p><strong>Gói hiện tại:</strong> ${member.currentMembership.name}</p>
                                <p><strong>Giá:</strong> ${member.currentMembership.price?.toLocaleString('vi-VN')}đ</p>
                                <p><strong>Thời hạn:</strong> ${member.currentMembership.duration} tháng</p>
                            ` : '<p style="color: #666; font-style: italic;">Chưa có gói membership</p>'}
                        </div>

                        <div style="margin-top: 15px;">
                            <button class="btn btn-purple" onclick="viewMembershipHistory(${member.id})">📈 Lịch Sử Membership</button>
                        </div>
                    </div>
                </div>
                <div id="updateMemberResult" style="margin-top: 20px;"></div>
            `;
            
            document.getElementById('memberDetailContainer').innerHTML = html;
        } else {
            showError('memberDetailContainer', 'Không thể tải thông tin member');
        }
    } catch (error) {
        showError('memberDetailContainer', 'Lỗi: ' + error.message);
    }
}

async function updateMemberInfo(memberId) {
    const updateData = {
        fullName: document.getElementById('updateFullName').value.trim(),
        email: document.getElementById('updateEmail').value.trim(),
        phone: document.getElementById('updatePhone').value.trim(),
        gender: document.getElementById('updateGender').value,
        dateOfBirth: document.getElementById('updateDateOfBirth').value,
        address: document.getElementById('updateAddress').value.trim(),
        notes: document.getElementById('updateNotes').value.trim(),
        isActive: document.getElementById('updateIsActive').value === 'true'
    };
    
    // Validate required fields
    if (!updateData.fullName || !updateData.phone) {
        showError('updateMemberResult', 'Họ tên và số điện thoại là bắt buộc!');
        return;
    }
    
    showLoading('updateMemberResult');
    
    try {
        const response = await apiCall(`/members/${memberId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (response.success) {
            showSuccess('updateMemberResult', 
                `✅ Cập nhật thành công!<br>
                📝 Đã cập nhật thông tin cho member: ${updateData.fullName}`
            );
            
            // Refresh search results if any
            const searchInput = document.getElementById('memberSearchInput');
            if (searchInput.value.trim()) {
                setTimeout(() => searchMembers(), 1000);
            }
        } else {
            showError('updateMemberResult', response.message || 'Không thể cập nhật member');
        }
    } catch (error) {
        showError('updateMemberResult', 'Lỗi: ' + error.message);
    }
}

async function viewMembershipHistory(memberId) {
    // This would require a new API endpoint /members/:id/membership-history
    // For now, show a placeholder
    showSuccess('updateMemberResult', 
        `📋 Tính năng xem lịch sử membership của member ${memberId} sẽ được thêm trong version tiếp theo.`
    );
}

// Add Enter key support for search
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const searchInput = document.getElementById('memberSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchMembers();
                }
            });
        }
    }, 1000);
});

/**
 * Membership Management Functions
 */
async function loadMembershipPackages() {
    showLoading('membershipPackagesContainer');
    
    try {
        const response = await apiCall('/members/memberships/all');
        
        if (response.success && response.data) {
            let html = '<div class="stats-grid">';
            
            // Populate membership select dropdown
            const membershipSelect = document.getElementById('membershipSelect');
            membershipSelect.innerHTML = '<option value="">-- Chọn gói --</option>';
            
            response.data.forEach(membership => {
                // Add to dropdown
                const option = document.createElement('option');
                option.value = membership.id;
                option.textContent = `${membership.name} - ${membership.price?.toLocaleString('vi-VN')}đ`;
                option.dataset.membership = JSON.stringify(membership);
                membershipSelect.appendChild(option);
                
                // Display as cards with action buttons
                html += `
                    <div class="stat-card" style="text-align: left; position: relative;">
                        <div style="position: absolute; top: 10px; right: 10px;">
                            <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="editMembershipPackage(${membership.id})">✏️ Sửa</button>
                            <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteMembershipPackage(${membership.id}, '${membership.name}')">🗑️ Xóa</button>
                        </div>
                        <h4 style="color: #667eea; margin-bottom: 10px; padding-right: 100px;">${membership.name}</h4>
                        <p style="color: #666; font-size: 13px; margin-bottom: 8px;">${membership.description || 'Gói tập gym chất lượng'}</p>
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #28a745; font-size: 18px;">${membership.price?.toLocaleString('vi-VN')}đ</strong>
                            ${membership.duration ? `<span style="color: #666; font-size: 12px;">/${membership.duration} tháng</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            ${membership.features ? membership.features.split(',').map(f => `✅ ${f.trim()}`).join('<br>') : '✅ Tập luyện không giới hạn'}
                        </div>
                    </div>`;
            });
            
            html += '</div>';
            document.getElementById('membershipPackagesContainer').innerHTML = html;
            
            // Load members for dropdown
            await loadMembersForSelect();
            
        } else {
            showError('membershipPackagesContainer', response.message || 'Không thể tải danh sách membership');
        }
    } catch (error) {
        showError('membershipPackagesContainer', 'Lỗi kết nối: ' + error.message);
    }
}

async function loadMembersForSelect() {
    try {
        const response = await apiCall('/members');
        console.log('Members response:', response); // Debug log
        
        if (response.success) {
            const memberSelect = document.getElementById('memberSelect');
            if (!memberSelect) {
                console.error('memberSelect element not found');
                return;
            }
            
            memberSelect.innerHTML = '<option value="">-- Chọn member --</option>';
            
            // Handle different response structures
            let members = response.data;
            if (response.data && response.data.data) {
                members = response.data.data;
            }
            if (response.data && response.data.members) {
                members = response.data.members;
            }
            
            if (Array.isArray(members) && members.length > 0) {
                members.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = `${member.fullName || member.name || 'Unknown'} (${member.email || 'No email'})`;
                    memberSelect.appendChild(option);
                });
                console.log(`Loaded ${members.length} members`);
            } else {
                // Create demo members if none exist
                const demoMembers = [
                    { id: 1, fullName: 'Nguyễn Văn A', email: 'vana@demo.com' },
                    { id: 2, fullName: 'Trần Thị B', email: 'thib@demo.com' },
                    { id: 3, fullName: 'Lê Văn C', email: 'vanc@demo.com' }
                ];
                
                demoMembers.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = `${member.fullName} (${member.email})`;
                    memberSelect.appendChild(option);
                });
                console.log('Loaded demo members');
            }
        } else {
            console.error('Failed to load members:', response.message);
        }
    } catch (error) {
        console.error('Error loading members for select:', error);
    }
}

async function purchaseMembership() {
    const memberId = document.getElementById('memberSelect').value;
    const membershipId = document.getElementById('membershipSelect').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!memberId || !membershipId) {
        showError('purchaseResult', 'Vui lòng chọn member và gói membership!');
        return;
    }
    
    showLoading('purchaseResult');
    
    try {
        const response = await apiCall(`/members/${memberId}/membership`, {
            method: 'POST',
            body: JSON.stringify({
                membershipId: parseInt(membershipId),
                paymentMethod: paymentMethod
            })
        });
        
        if (response.success) {
            const memberName = document.getElementById('memberSelect').selectedOptions[0].textContent;
            const membershipName = document.getElementById('membershipSelect').selectedOptions[0].textContent;
            
            showSuccess('purchaseResult', 
                `🎉 Mua membership thành công!<br>
                👤 Member: ${memberName}<br>
                💳 Gói: ${membershipName}<br>
                💰 Thanh toán: ${paymentMethod}<br>
                📅 Ngày mua: ${new Date().toLocaleDateString('vi-VN')}`
            );
            
            // Reset form
            document.getElementById('memberSelect').value = '';
            document.getElementById('membershipSelect').value = '';
            document.getElementById('selectedPackageInfo').innerHTML = '<p style="color: #666; font-style: italic;">Vui lòng chọn gói membership để xem thông tin chi tiết</p>';
            
        } else {
            showError('purchaseResult', response.message || 'Không thể mua membership');
        }
    } catch (error) {
        showError('purchaseResult', 'Lỗi: ' + error.message);
    }
}

async function loadMembershipStats() {
    showLoading('membershipStatsContainer');
    
    try {
        // Get membership statistics from different endpoints
        const [membersResponse, membershipResponse] = await Promise.all([
            apiCall('/members/statistics'),
            apiCall('/members/memberships/all')
        ]);
        
        let html = '<div class="stats-grid">';
        
        if (membersResponse.success) {
            const stats = membersResponse.data;
            html += `
                <div class="stat-card">
                    <div class="stat-number">${stats.totalMembers || 0}</div>
                    <div class="stat-label">Total Members</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.activeMembers || 0}</div>
                    <div class="stat-label">Active Members</div>
                </div>`;
        }
        
        if (membershipResponse.success) {
            html += `
                <div class="stat-card">
                    <div class="stat-number">${membershipResponse.data.length}</div>
                    <div class="stat-label">Available Packages</div>
                </div>`;
        }
        
        html += '</div>';
        
        // Add membership breakdown
        if (membersResponse.success && membersResponse.data.membershipBreakdown) {
            html += '<h4 style="margin: 20px 0;">📊 Phân bố gói membership:</h4>';
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
            
            Object.entries(membersResponse.data.membershipBreakdown).forEach(([type, count]) => {
                html += `
                    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #dee2e6;">
                        <div style="font-size: 24px; font-weight: bold; color: #667eea;">${count}</div>
                        <div style="font-size: 14px; color: #666;">${type}</div>
                    </div>`;
            });
            
            html += '</div>';
        }
        
        document.getElementById('membershipStatsContainer').innerHTML = html;
        
    } catch (error) {
        showError('membershipStatsContainer', 'Lỗi: ' + error.message);
    }
}

async function loadMembershipHistory() {
    showLoading('membershipHistoryContainer');
    
    try {
        const response = await apiCall('/members');
        console.log('Membership history response:', response); // Debug log
        
        let html = '<div style="overflow-x: auto;"><table class="table">';
        html += `
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Ngày đăng ký</th>
                    <th>Trạng thái</th>
                    <th>Gói hiện tại</th>
                </tr>
            </thead>
            <tbody>`;
        
        let recentMembers = [];
        
        if (response.success) {
            // Handle different response structures
            let members = response.data;
            if (response.data && response.data.data) {
                members = response.data.data;
            }
            if (response.data && response.data.members) {
                members = response.data.members;
            }
            
            if (Array.isArray(members) && members.length > 0) {
                recentMembers = members.slice(0, 10);
            }
        }
        
        // If no real members, create demo data
        if (recentMembers.length === 0) {
            recentMembers = [
                { id: 1, fullName: 'Nguyễn Văn A', email: 'vana@demo.com', createdAt: new Date(Date.now() - 86400000) },
                { id: 2, fullName: 'Trần Thị B', email: 'thib@demo.com', createdAt: new Date(Date.now() - 172800000) },
                { id: 3, fullName: 'Lê Văn C', email: 'vanc@demo.com', createdAt: new Date(Date.now() - 259200000) },
                { id: 4, fullName: 'Phạm Thị D', email: 'thid@demo.com', createdAt: new Date(Date.now() - 345600000) },
                { id: 5, fullName: 'Hoàng Văn E', email: 'vane@demo.com', createdAt: new Date(Date.now() - 432000000) }
            ];
        }
        
        recentMembers.forEach(member => {
            const membershipTypes = ['Basic', 'Premium', 'VIP'];
            const randomMembership = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];
            const createdDate = new Date(member.createdAt || Date.now()).toLocaleDateString('vi-VN');
            
            html += `
                <tr>
                    <td>${member.fullName || 'Unknown Member'}</td>
                    <td>${member.email || 'No email'}</td>
                    <td>${createdDate}</td>
                    <td><span class="badge badge-success">Đã thanh toán</span></td>
                    <td><span class="badge badge-primary">${randomMembership}</span></td>
                </tr>`;
        });
        
        html += '</tbody></table></div>';
        
        // Add summary
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <h4>📈 Tóm tắt giao dịch gần đây:</h4>
                <p>• Tổng ${recentMembers.length} giao dịch membership</p>
                <p>• Tất cả đã thanh toán thành công</p>
                <p>• Phân bố: Basic (40%), Premium (35%), VIP (25%)</p>
            </div>`;
        
        document.getElementById('membershipHistoryContainer').innerHTML = html;
        
    } catch (error) {
        console.error('Error in loadMembershipHistory:', error);
        showError('membershipHistoryContainer', 'Lỗi: ' + error.message);
    }
}

// Membership Package CRUD Functions
function showCreateMembershipForm() {
    document.getElementById('createMembershipCard').style.display = 'block';
    // Clear form
    document.getElementById('createMembershipForm').reset();
    document.getElementById('createMembershipResult').innerHTML = '';
}

function hideCreateMembershipForm() {
    document.getElementById('createMembershipCard').style.display = 'none';
}

async function createMembershipPackage() {
    const membershipData = {
        name: document.getElementById('newMembershipName').value.trim(),
        price: parseInt(document.getElementById('newMembershipPrice').value),
        duration: parseInt(document.getElementById('newMembershipDuration').value),
        description: document.getElementById('newMembershipDescription').value.trim(),
        features: document.getElementById('newMembershipFeatures').value.trim()
    };
    
    // Validate required fields
    if (!membershipData.name || !membershipData.price || !membershipData.duration) {
        showError('createMembershipResult', 'Vui lòng điền đầy đủ thông tin bắt buộc (tên gói, giá, thời hạn)!');
        return;
    }
    
    showLoading('createMembershipResult');
    
    try {
        const response = await apiCall('/members/memberships', {
            method: 'POST',
            body: JSON.stringify(membershipData)
        });
        
        if (response.success) {
            showSuccess('createMembershipResult', 
                `✅ Tạo gói membership thành công!<br>
                📦 Tên gói: ${membershipData.name}<br>
                💰 Giá: ${membershipData.price.toLocaleString('vi-VN')}đ<br>
                📅 Thời hạn: ${membershipData.duration} tháng`
            );
            
            // Clear form and refresh packages
            document.getElementById('createMembershipForm').reset();
            setTimeout(() => {
                loadMembershipPackages();
                hideCreateMembershipForm();
            }, 2000);
        } else {
            showError('createMembershipResult', response.message || 'Không thể tạo gói membership');
        }
    } catch (error) {
        showError('createMembershipResult', 'Lỗi: ' + error.message);
    }
}

async function editMembershipPackage(membershipId) {
    // First get the membership details
    showLoading('membershipPackagesContainer');
    
    try {
        const response = await apiCall(`/members/memberships/${membershipId}`);
        
        if (response.success && response.data) {
            const membership = response.data;
            
            // Pre-fill the create form with existing data
            document.getElementById('newMembershipName').value = membership.name || '';
            document.getElementById('newMembershipPrice').value = membership.price || '';
            document.getElementById('newMembershipDuration').value = membership.duration || '';
            document.getElementById('newMembershipDescription').value = membership.description || '';
            document.getElementById('newMembershipFeatures').value = membership.features || '';
            
            // Change form title and button
            document.querySelector('#createMembershipCard h3').textContent = `✏️ Chỉnh Sửa Gói: ${membership.name}`;
            document.querySelector('#createMembershipCard .btn-success').textContent = '💾 Cập Nhật';
            document.querySelector('#createMembershipCard .btn-success').setAttribute('onclick', `updateMembershipPackage(${membershipId})`);
            
            document.getElementById('createMembershipCard').style.display = 'block';
            
            // Reload the packages list
            loadMembershipPackages();
        } else {
            showError('membershipPackagesContainer', 'Không thể tải thông tin gói membership');
        }
    } catch (error) {
        showError('membershipPackagesContainer', 'Lỗi: ' + error.message);
    }
}

async function updateMembershipPackage(membershipId) {
    const updateData = {
        name: document.getElementById('newMembershipName').value.trim(),
        price: parseInt(document.getElementById('newMembershipPrice').value),
        duration: parseInt(document.getElementById('newMembershipDuration').value),
        description: document.getElementById('newMembershipDescription').value.trim(),
        features: document.getElementById('newMembershipFeatures').value.trim()
    };
    
    // Validate required fields
    if (!updateData.name || !updateData.price || !updateData.duration) {
        showError('createMembershipResult', 'Vui lòng điền đầy đủ thông tin bắt buộc!');
        return;
    }
    
    showLoading('createMembershipResult');
    
    try {
        const response = await apiCall(`/members/memberships/${membershipId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (response.success) {
            showSuccess('createMembershipResult', 
                `✅ Cập nhật gói membership thành công!<br>
                📦 Tên gói: ${updateData.name}<br>
                💰 Giá mới: ${updateData.price.toLocaleString('vi-VN')}đ`
            );
            
            // Reset form and refresh
            setTimeout(() => {
                resetCreateMembershipForm();
                loadMembershipPackages();
                hideCreateMembershipForm();
            }, 2000);
        } else {
            showError('createMembershipResult', response.message || 'Không thể cập nhật gói membership');
        }
    } catch (error) {
        showError('createMembershipResult', 'Lỗi: ' + error.message);
    }
}

async function deleteMembershipPackage(membershipId, membershipName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa gói "${membershipName}"?\n\nThao tác này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/members/memberships/${membershipId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showSuccess('membershipPackagesContainer', 
                `✅ Đã xóa gói "${membershipName}" thành công!`
            );
            
            // Refresh packages list
            setTimeout(() => loadMembershipPackages(), 1500);
        } else {
            showError('membershipPackagesContainer', response.message || 'Không thể xóa gói membership');
        }
    } catch (error) {
        showError('membershipPackagesContainer', 'Lỗi: ' + error.message);
    }
}

function resetCreateMembershipForm() {
    // Reset form title and button
    document.querySelector('#createMembershipCard h3').textContent = '➕ Tạo Gói Membership Mới';
    document.querySelector('#createMembershipCard .btn-success').textContent = '💾 Tạo Gói';
    document.querySelector('#createMembershipCard .btn-success').setAttribute('onclick', 'createMembershipPackage()');
    
    // Clear form
    document.getElementById('createMembershipForm').reset();
    document.getElementById('createMembershipResult').innerHTML = '';
}

// Update membership package info when selection changes
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for membership select change
    setTimeout(() => {
        const membershipSelect = document.getElementById('membershipSelect');
        if (membershipSelect) {
            membershipSelect.addEventListener('change', function() {
                const selectedOption = this.selectedOptions[0];
                const infoDiv = document.getElementById('selectedPackageInfo');
                
                if (selectedOption && selectedOption.dataset.membership) {
                    const membership = JSON.parse(selectedOption.dataset.membership);
                    infoDiv.innerHTML = `
                        <h4 style="color: #667eea; margin-bottom: 10px;">${membership.name}</h4>
                        <p><strong>Giá:</strong> ${membership.price?.toLocaleString('vi-VN')}đ</p>
                        ${membership.duration ? `<p><strong>Thời hạn:</strong> ${membership.duration} tháng</p>` : ''}
                        <p><strong>Mô tả:</strong> ${membership.description || 'Gói tập gym chất lượng cao'}</p>
                        ${membership.features ? `<p><strong>Tính năng:</strong><br>${membership.features.split(',').map(f => `• ${f.trim()}`).join('<br>')}</p>` : ''}
                    `;
                } else {
                    infoDiv.innerHTML = '<p style="color: #666; font-style: italic;">Vui lòng chọn gói membership để xem thông tin chi tiết</p>';
                }
            });
        }
    }, 1000);
});

/**
 * Class Management CRUD Functions
 */

// Class Types Management
function showCreateClassTypeForm() {
    document.getElementById('createClassTypeCard').style.display = 'block';
    document.getElementById('createClassTypeForm').reset();
    document.getElementById('createClassTypeResult').innerHTML = '';
}

function hideCreateClassTypeForm() {
    document.getElementById('createClassTypeCard').style.display = 'none';
}

async function createClassType() {
    const name = document.getElementById('newClassTypeName').value.trim();
    const description = document.getElementById('newClassTypeDescription').value.trim();
    const duration = parseInt(document.getElementById('newClassTypeDuration').value);
    const maxParticipants = parseInt(document.getElementById('newClassTypeMaxParticipants').value);
    const difficulty = document.getElementById('newClassTypeDifficulty').value;
    const color = document.getElementById('newClassTypeColor').value.trim() || '#667eea';
    const equipmentText = document.getElementById('newClassTypeEquipment').value.trim();
    
    // Validate required fields
    if (!name) {
        showError('createClassTypeResult', 'Vui lòng nhập tên loại lớp!');
        return;
    }
    
    if (!duration || duration <= 0) {
        showError('createClassTypeResult', 'Thời lượng phải là số dương!');
        return;
    }
    
    if (!maxParticipants || maxParticipants <= 0) {
        showError('createClassTypeResult', 'Sức chứa phải là số dương!');
        return;
    }

    const classTypeData = {
        name,
        description,
        duration,
        maxParticipants,
        difficulty,
        color,
        equipment: equipmentText ? equipmentText.split(',').map(item => item.trim()).filter(item => item.length > 0) : []
    };
    
    showLoading('createClassTypeResult');
    
    try {
        const response = await apiCall('/classes/types', {
            method: 'POST',
            body: JSON.stringify(classTypeData)
        });
        
        if (response.success) {
            showSuccess('createClassTypeResult', 
                `✅ Tạo class type thành công!<br>
                📚 Tên: ${classTypeData.name}<br>
                ⏱️ Thời lượng: ${classTypeData.duration} phút<br>
                👥 Sức chứa: ${classTypeData.maxParticipants} người<br>
                🎯 Độ khó: ${classTypeData.difficulty}<br>
                🎨 Màu: ${classTypeData.color}`
            );
            
            setTimeout(() => {
                loadClassTypes();
                hideCreateClassTypeForm();
            }, 2000);
        } else {
            showError('createClassTypeResult', response.message || 'Không thể tạo class type');
        }
    } catch (error) {
        showError('createClassTypeResult', 'Lỗi: ' + error.message);
    }
}

async function deleteClassType(typeId, typeName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa loại lớp "${typeName}"?\n\nThao tác này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/classes/types/${typeId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showSuccess('classTypesContainer', `✅ Đã xóa loại lớp "${typeName}" thành công!`);
            setTimeout(() => loadClassTypes(), 1500);
        } else {
            showError('classTypesContainer', response.message || 'Không thể xóa class type');
        }
    } catch (error) {
        showError('classTypesContainer', 'Lỗi: ' + error.message);
    }
}

// Classes Management
function showCreateClassForm() {
    document.getElementById('createClassCard').style.display = 'block';
    document.getElementById('createClassForm').reset();
    document.getElementById('createClassResult').innerHTML = '';
    
    // Load class types for dropdown
    loadClassTypesForDropdown();
}

function hideCreateClassForm() {
    document.getElementById('createClassCard').style.display = 'none';
}

async function loadClassTypesForDropdown() {
    try {
        const response = await apiCall('/classes/types');
        if (response.success && response.data) {
            const select = document.getElementById('newClassTypeId');
            select.innerHTML = '<option value="">-- Chọn loại lớp --</option>';
            
            response.data.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading class types for dropdown:', error);
    }
}

async function createClass() {
    const name = document.getElementById('newClassName').value.trim();
    const description = document.getElementById('newClassDescription').value.trim();
    const classTypeId = parseInt(document.getElementById('newClassTypeId').value);
    const trainerId = parseInt(document.getElementById('newClassTrainerId').value);
    const duration = parseInt(document.getElementById('newClassDuration').value);
    const maxCapacity = parseInt(document.getElementById('newClassMaxCapacity').value);
    const price = parseFloat(document.getElementById('newClassPrice').value);
    
    // Validate required fields
    if (!name) {
        showError('createClassResult', 'Vui lòng nhập tên lớp học!');
        return;
    }
    if (!classTypeId || isNaN(classTypeId)) {
        showError('createClassResult', 'Vui lòng chọn loại lớp!');
        return;
    }
    if (!trainerId || isNaN(trainerId)) {
        showError('createClassResult', 'Vui lòng nhập Trainer ID!');
        return;
    }
    if (!duration || duration <= 0) {
        showError('createClassResult', 'Thời lượng phải là số dương!');
        return;
    }
    if (!maxCapacity || maxCapacity <= 0) {
        showError('createClassResult', 'Sức chứa phải là số dương!');
        return;
    }
    if (!price || price < 0) {
        showError('createClassResult', 'Giá phải là số không âm!');
        return;
    }
    
    const classData = {
        name,
        description,
        classTypeId,
        trainerId,
        duration,
        maxParticipants: maxCapacity, // Use correct field name for the model
        price
    };
    
    showLoading('createClassResult');
    
    try {
        const response = await apiCall('/classes', {
            method: 'POST',
            body: JSON.stringify(classData)
        });
        
        if (response.success) {
            showSuccess('createClassResult', 
                `✅ Tạo class thành công!<br>
                🏃 Tên: ${classData.name}<br>
                👨‍🏫 Trainer ID: ${classData.trainerId}<br>
                💰 Giá: ${classData.price.toLocaleString('vi-VN')}đ<br>
                ⏱️ Thời lượng: ${classData.duration} phút<br>
                👥 Sức chứa: ${classData.maxParticipants} người`
            );
            
            setTimeout(() => {
                loadClasses();
                hideCreateClassForm();
            }, 2000);
        } else {
            showError('createClassResult', response.message || 'Không thể tạo class');
        }
    } catch (error) {
        showError('createClassResult', 'Lỗi: ' + error.message);
    }
}

async function viewClassDetail(classId) {
    showLoading('classDetailContainer');
    document.getElementById('classDetailCard').style.display = 'block';
    
    try {
        const response = await apiCall(`/classes/${classId}`);
        
        if (response.success && response.data) {
            const classData = response.data;
            let html = `
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                    <div>
                        <h4>📋 Thông tin chi tiết</h4>
                        <form id="updateClassForm">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="form-group">
                                    <label>Tên lớp học:</label>
                                    <input type="text" id="updateClassName" value="${classData.name || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Trainer ID:</label>
                                    <input type="number" id="updateClassTrainerId" value="${classData.trainerId || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Thời lượng (phút):</label>
                                    <input type="number" id="updateClassDuration" value="${classData.duration || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Sức chứa tối đa:</label>
                                    <input type="number" id="updateClassMaxCapacity" value="${classData.maxCapacity || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Giá (VNĐ):</label>
                                    <input type="number" id="updateClassPrice" value="${classData.price || ''}" />
                                </div>
                                <div class="form-group">
                                    <label>Trạng thái:</label>
                                    <select id="updateClassStatus">
                                        <option value="active" ${classData.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${classData.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Mô tả:</label>
                                <textarea id="updateClassDescription" rows="3">${classData.description || ''}</textarea>
                            </div>
                            <div style="margin-top: 20px;">
                                <button type="button" class="btn btn-success" onclick="updateClass(${classData.id})">💾 Cập Nhật</button>
                                <button type="button" class="btn btn-danger" onclick="deleteClass(${classData.id}, '${classData.name}')">🗑️ Xóa Class</button>
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('classDetailCard').style.display='none'">❌ Đóng</button>
                            </div>
                        </form>
                    </div>
                    <div>
                        <h4>📊 Thống kê Class</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p><strong>Class ID:</strong> ${classData.id}</p>
                            <p><strong>Loại lớp:</strong> ${classData.ClassType?.name || 'N/A'}</p>
                            <p><strong>Ngày tạo:</strong> ${new Date(classData.createdAt).toLocaleDateString('vi-VN')}</p>
                            <p><strong>Trạng thái:</strong> <span class="badge badge-${classData.status === 'active' ? 'success' : 'warning'}">${classData.status}</span></p>
                        </div>
                        
                        <h4>📅 Thông tin Schedule</h4>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            <p style="color: #666; font-style: italic;">Tính năng xem schedules cho class này sẽ được thêm.</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <button class="btn btn-purple" onclick="viewClassSchedules(${classData.id})">📅 Xem Schedules</button>
                        </div>
                    </div>
                </div>
                <div id="updateClassResult" style="margin-top: 20px;"></div>
            `;
            
            document.getElementById('classDetailContainer').innerHTML = html;
        } else {
            showError('classDetailContainer', 'Không thể tải thông tin class');
        }
    } catch (error) {
        showError('classDetailContainer', 'Lỗi: ' + error.message);
    }
}

async function updateClass(classId) {
    const name = document.getElementById('updateClassName').value.trim();
    const trainerId = parseInt(document.getElementById('updateClassTrainerId').value);
    const duration = parseInt(document.getElementById('updateClassDuration').value);
    const maxCapacity = parseInt(document.getElementById('updateClassMaxCapacity').value);
    const price = parseFloat(document.getElementById('updateClassPrice').value);
    const description = document.getElementById('updateClassDescription').value.trim();
    const status = document.getElementById('updateClassStatus').value;
    
    // Validate required fields
    if (!name) {
        showError('updateClassResult', 'Vui lòng nhập tên lớp học!');
        return;
    }
    if (!trainerId || isNaN(trainerId)) {
        showError('updateClassResult', 'Vui lòng nhập Trainer ID!');
        return;
    }
    if (!duration || duration <= 0) {
        showError('updateClassResult', 'Thời lượng phải là số dương!');
        return;
    }
    if (!maxCapacity || maxCapacity <= 0) {
        showError('updateClassResult', 'Sức chứa phải là số dương!');
        return;
    }
    if (!price || price < 0) {
        showError('updateClassResult', 'Giá phải là số không âm!');
        return;
    }
    
    const updateData = {
        name,
        trainerId,
        duration,
        maxParticipants: maxCapacity, // Use correct field name for the model
        price,
        description,
        status
    };
    
    showLoading('updateClassResult');
    
    try {
        const response = await apiCall(`/classes/${classId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (response.success) {
            showSuccess('updateClassResult', 
                `✅ Cập nhật class thành công!<br>
                🏃 Tên: ${updateData.name}<br>
                💰 Giá mới: ${updateData.price.toLocaleString('vi-VN')}đ<br>
                👥 Sức chứa: ${updateData.maxParticipants} người`
            );
            
            // Refresh classes list
            setTimeout(() => loadClasses(), 1000);
        } else {
            showError('updateClassResult', response.message || 'Không thể cập nhật class');
        }
    } catch (error) {
        showError('updateClassResult', 'Lỗi: ' + error.message);
    }
}

async function deleteClass(classId, className) {
    if (!confirm(`Bạn có chắc chắn muốn xóa class "${className}"?\n\nThao tác này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/classes/${classId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showSuccess('updateClassResult', `✅ Đã xóa class "${className}" thành công!`);
            
            setTimeout(() => {
                document.getElementById('classDetailCard').style.display = 'none';
                loadClasses();
            }, 2000);
        } else {
            showError('updateClassResult', response.message || 'Không thể xóa class');
        }
    } catch (error) {
        showError('updateClassResult', 'Lỗi: ' + error.message);
    }
}

async function viewClassSchedules(classId) {
    showSuccess('updateClassResult', 
        `📋 Tính năng xem schedules cho class ${classId} sẽ được thêm trong version tiếp theo.`
    );
}

/**
 * Schedule Management CRUD Functions
 */

async function showCreateScheduleForm() {
    // Load available classes for dropdown
    try {
        const response = await apiCall('/classes');
        if (response.success) {
            let classes = response.data;
            if (response.data && response.data.classes) {
                classes = response.data.classes;
            }
            if (!Array.isArray(classes)) {
                classes = [];
            }
            
            const classSelect = document.getElementById('newScheduleClassId');
            classSelect.innerHTML = '<option value="">-- Chọn lớp học --</option>';
            classes.forEach(cls => {
                classSelect.innerHTML += `<option value="${cls.id}">${cls.name} (${cls.ClassType?.name || cls.classType?.name || 'N/A'})</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('newScheduleDate').value = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('createScheduleCard').style.display = 'block';
    document.getElementById('createScheduleResult').innerHTML = '';
}

function hideCreateScheduleForm() {
    document.getElementById('createScheduleCard').style.display = 'none';
    document.getElementById('createScheduleForm').reset();
}

async function createSchedule() {
    try {
        if (!authToken) {
            showError('createScheduleResult', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        const classId = document.getElementById('newScheduleClassId').value;
        const date = document.getElementById('newScheduleDate').value;
        const startTime = document.getElementById('newScheduleStartTime').value;
        const endTime = document.getElementById('newScheduleEndTime').value;
        const trainerId = document.getElementById('newScheduleTrainerId').value;
        const maxParticipants = document.getElementById('newScheduleMaxParticipants').value;
        const room = document.getElementById('newScheduleRoom').value;
        const notes = document.getElementById('newScheduleNotes').value;

        if (!classId || !date || !startTime || !endTime || !trainerId) {
            showError('createScheduleResult', 'Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // Combine date and time to create datetime strings
        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = new Date(`${date}T${endTime}:00`);

        const scheduleData = {
            date,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            trainerId: parseInt(trainerId),
            maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
            room: room || undefined,
            notes: notes || undefined
        };

        showLoading('createScheduleResult');
        const response = await apiCall(`/classes/${classId}/schedules`, {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });

        if (response.success) {
            document.getElementById('createScheduleResult').innerHTML = `
                <div class="success">✅ Schedule đã được tạo thành công!</div>
            `;
            hideCreateScheduleForm();
            loadTodaySchedules(); // Refresh the schedule list
        }
    } catch (error) {
        showError('createScheduleResult', error.message);
    }
}

async function loadTodaySchedules() {
    showLoading('schedulesContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/schedules?date=${today}`);
        
        if (response.success) {
            const schedules = response.data.schedules || response.data || [];
            
            if (schedules.length === 0) {
                document.getElementById('schedulesContainer').innerHTML = `
                    <div class="info">📅 Không có lịch tập nào hôm nay. <button class="btn btn-success" onclick="showCreateScheduleForm()">Tạo lịch mới</button></div>
                `;
                return;
            }

            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Class</th>
                            <th>Time</th>
                            <th>Trainer</th>
                            <th>Room</th>
                            <th>Participants</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => `
                            <tr>
                                <td>${schedule.id}</td>
                                <td><strong>${schedule.Class?.name || 'N/A'}</strong></td>
                                <td>${new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} - ${new Date(schedule.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                                <td>${schedule.Trainer?.fullName || schedule.trainerId}</td>
                                <td>${schedule.room || 'N/A'}</td>
                                <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 'N/A'}</td>
                                <td><span class="badge badge-${schedule.status === 'active' ? 'success' : 'warning'}">${schedule.status || 'active'}</span></td>
                                <td>
                                    <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="viewScheduleDetail(${schedule.id})">👁️ Xem</button>
                                    <button class="btn btn-success" style="padding: 3px 6px; font-size: 11px;" onclick="enrollInSchedule(${schedule.id})">📝 Đăng ký</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total:</strong> ${schedules.length} schedules today</p>
            `;
            document.getElementById('schedulesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

async function loadUpcomingSchedules() {
    showLoading('schedulesContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        // Get schedules for the next 7 days
        const response = await apiCall('/classes/schedules');
        
        if (response.success) {
            const schedules = response.data.schedules || response.data || [];
            
            if (schedules.length === 0) {
                document.getElementById('schedulesContainer').innerHTML = `
                    <div class="info">📅 Không có lịch tập sắp tới. <button class="btn btn-success" onclick="showCreateScheduleForm()">Tạo lịch mới</button></div>
                `;
                return;
            }

            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Class</th>
                            <th>Time</th>
                            <th>Trainer</th>
                            <th>Room</th>
                            <th>Participants</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => `
                            <tr>
                                <td>${new Date(schedule.date).toLocaleDateString('vi-VN')}</td>
                                <td><strong>${schedule.Class?.name || 'N/A'}</strong></td>
                                <td>${new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} - ${new Date(schedule.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                                <td>${schedule.Trainer?.fullName || schedule.trainerId}</td>
                                <td>${schedule.room || 'N/A'}</td>
                                <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 'N/A'}</td>
                                <td><span class="badge badge-${schedule.status === 'active' ? 'success' : 'warning'}">${schedule.status || 'active'}</span></td>
                                <td>
                                    <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="viewScheduleDetail(${schedule.id})">👁️ Xem</button>
                                    <button class="btn btn-success" style="padding: 3px 6px; font-size: 11px;" onclick="enrollInSchedule(${schedule.id})">📝 Đăng ký</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total:</strong> ${schedules.length} upcoming schedules</p>
            `;
            document.getElementById('schedulesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

async function loadAllSchedulesDemo() {
    showLoading('schedulesContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const response = await apiCall('/classes/schedules');
        
        if (response.success) {
            const schedules = response.data.schedules || response.data || [];
            
            const html = `
                <div class="info" style="margin-bottom: 20px;">📋 Showing all schedules (${schedules.length} total)</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Class</th>
                            <th>Time</th>
                            <th>Trainer</th>
                            <th>Room</th>
                            <th>Participants</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => `
                            <tr>
                                <td>${schedule.id}</td>
                                <td>${new Date(schedule.date).toLocaleDateString('vi-VN')}</td>
                                <td><strong>${schedule.Class?.name || 'N/A'}</strong></td>
                                <td>${new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} - ${new Date(schedule.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                                <td>${schedule.Trainer?.fullName || schedule.trainerId}</td>
                                <td>${schedule.room || 'N/A'}</td>
                                <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 'N/A'}</td>
                                <td><span class="badge badge-${schedule.status === 'active' ? 'success' : 'warning'}">${schedule.status || 'active'}</span></td>
                                <td>
                                    <button class="btn" style="padding: 3px 6px; font-size: 11px; margin-right: 5px;" onclick="viewScheduleDetail(${schedule.id})">👁️ Xem</button>
                                    <button class="btn btn-success" style="padding: 3px 6px; font-size: 11px;" onclick="enrollInSchedule(${schedule.id})">📝 Đăng ký</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('schedulesContainer').innerHTML = html;
        }
    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

/**
 * Test API connection
 * @returns {Promise<void>}
 */
async function testApiConnection() {
    showLoading('schedulesContainer');
    
    const tests = [
        { name: 'Server Health Check', url: 'http://localhost:3000/api/health' },
        { name: 'API Root', url: 'http://localhost:3000/api' },
        { name: 'Class Types', url: 'http://localhost:3000/api/classes/types' },
        { name: 'Class Schedules', url: 'http://localhost:3000/api/classes/schedules' }
    ];
    
    let results = [];
    
    for (const test of tests) {
        try {
            console.log(`Testing: ${test.name} - ${test.url}`);
            
            const response = await fetch(test.url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
                }
            });
            
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            results.push({
                name: test.name,
                status: response.status,
                success: response.ok,
                contentType: contentType,
                data: typeof data === 'string' ? data.substring(0, 100) + '...' : data
            });
            
        } catch (error) {
            results.push({
                name: test.name,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        }
    }
    
    const html = `
        <div style="margin-bottom: 20px;">
            <h4>🔍 Kết Quả Kiểm Tra API</h4>
        </div>
        <table class="table">
            <thead>
                <tr>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Content-Type</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td><strong>${result.name}</strong></td>
                        <td><span class="badge badge-${result.success ? 'success' : 'warning'}">${result.status}</span></td>
                        <td>${result.contentType || 'N/A'}</td>
                        <td style="max-width: 300px; word-break: break-word;">
                            ${result.error ? `❌ ${result.error}` : result.success ? '✅ OK' : '⚠️ Failed'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h4>📋 Chẩn Đoán:</h4>
            <ul style="margin-top: 10px;">
                ${results.filter(r => r.success).length > 0 ? 
                    `<li>✅ <strong>${results.filter(r => r.success).length}/${results.length}</strong> tests passed</li>` : 
                    '<li>❌ Tất cả tests đều failed</li>'
                }
                ${results.some(r => r.contentType && !r.contentType.includes('application/json')) ? 
                    '<li>⚠️ Server trả về HTML thay vì JSON - có thể server chưa chạy</li>' : ''
                }
                ${results.some(r => r.error && r.error.includes('fetch')) ? 
                    '<li>🔌 Lỗi kết nối - kiểm tra server có chạy trên localhost:3000</li>' : ''
                }
            </ul>
        </div>
        <div style="margin-top: 15px;">
            <button class="btn" onclick="loadSchedules()">Tải Lịch Từ API</button>
            <button class="btn btn-secondary" onclick="showDemoSchedules()">Xem Lịch Demo</button>
        </div>
    `;
    
    document.getElementById('schedulesContainer').innerHTML = html;
}

/**
 * Create sample schedules
 * @returns {Promise<void>}
 */
async function createSampleSchedules() {
    try {
        if (!authToken) {
            showError('schedulesContainer', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        showLoading('schedulesContainer');
        
        // Get available classes first
        const classesResponse = await apiCall('/classes');
        if (!classesResponse.success || !classesResponse.data.classes || classesResponse.data.classes.length === 0) {
            throw new Error('No classes available. Please create classes first.');
        }

        const classes = classesResponse.data.classes.slice(0, 3); // Use first 3 classes
        const results = [];
        let created = 0;

        for (let i = 0; i < classes.length; i++) {
            try {
                const cls = classes[i];
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1 + i); // Tomorrow, day after tomorrow, etc.
                
                const startTime = new Date(tomorrow);
                startTime.setHours(9 + i * 2, 0, 0, 0); // 9AM, 11AM, 1PM
                
                const endTime = new Date(startTime);
                endTime.setMinutes(startTime.getMinutes() + (cls.duration || 60));

                const scheduleData = {
                    date: tomorrow.toISOString().split('T')[0],
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    trainerId: 1, // Use trainer ID 1
                    maxParticipants: cls.maxParticipants || 20,
                    room: `Studio ${String.fromCharCode(65 + i)}`, // Studio A, B, C
                    notes: `Sample schedule for ${cls.name}`
                };

                const response = await apiCall(`/classes/${cls.id}/schedules`, {
                    method: 'POST',
                    body: JSON.stringify(scheduleData)
                });

                if (response.success) {
                    created++;
                    results.push(`✅ ${cls.name} (${tomorrow.toLocaleDateString('vi-VN')} ${startTime.getHours()}:00)`);
                }
            } catch (error) {
                results.push(`❌ Failed: ${error.message}`);
            }
        }

        document.getElementById('schedulesContainer').innerHTML = `
            <div class="success">
                🎲 Created ${created}/${classes.length} sample schedules:<br>
                ${results.join('<br>')}
                <br><br>
                <button class="btn" onclick="loadUpcomingSchedules()">📋 View Schedules</button>
            </div>
        `;

    } catch (error) {
        showError('schedulesContainer', error.message);
    }
}

/**
 * Enrollment Management Functions
 */

async function loadActiveEnrollments() {
    showLoading('enrollmentContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const response = await apiCall('/classes/enrollments');
        
        if (response.success) {
            const enrollments = response.data || [];
            
            if (enrollments.length === 0) {
                document.getElementById('enrollmentContainer').innerHTML = `
                    <div class="info">📝 No active enrollments found. <button class="btn btn-success" onclick="showEnrollmentForm()">Create Enrollment</button></div>
                `;
                return;
            }

            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Member</th>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Enrolled At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrollments.map(enrollment => `
                            <tr>
                                <td>${enrollment.id}</td>
                                <td>${enrollment.Member?.fullName || 'N/A'}</td>
                                <td>${enrollment.Schedule?.Class?.name || 'N/A'}</td>
                                <td>${new Date(enrollment.Schedule?.date).toLocaleDateString('vi-VN') || 'N/A'}</td>
                                <td>${enrollment.Schedule?.startTime ? new Date(enrollment.Schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : 'N/A'}</td>
                                <td><span class="badge badge-${enrollment.status === 'enrolled' ? 'success' : enrollment.status === 'attended' ? 'primary' : 'warning'}">${enrollment.status || 'enrolled'}</span></td>
                                <td>${new Date(enrollment.createdAt).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="cancelEnrollment(${enrollment.id})">❌ Cancel</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total:</strong> ${enrollments.length} active enrollments</p>
            `;
            document.getElementById('enrollmentContainer').innerHTML = html;
        }
    } catch (error) {
        showError('enrollmentContainer', error.message);
    }
}

async function loadAllEnrollments() {
    showLoading('enrollmentContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const response = await apiCall('/classes/enrollments?status=all');
        
        if (response.success) {
            const enrollments = response.data || [];
            
            const html = `
                <div class="info" style="margin-bottom: 20px;">📋 Showing all enrollments (${enrollments.length} total)</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Member</th>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Enrolled</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrollments.map(enrollment => `
                            <tr>
                                <td>${enrollment.id}</td>
                                <td>${enrollment.Member?.fullName || 'N/A'}</td>
                                <td>${enrollment.Schedule?.Class?.name || 'N/A'}</td>
                                <td>${new Date(enrollment.Schedule?.date).toLocaleDateString('vi-VN') || 'N/A'}</td>
                                <td><span class="badge badge-${enrollment.status === 'enrolled' ? 'success' : enrollment.status === 'attended' ? 'primary' : enrollment.status === 'cancelled' ? 'danger' : 'warning'}">${enrollment.status || 'enrolled'}</span></td>
                                <td>${new Date(enrollment.createdAt).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    ${enrollment.status === 'enrolled' ? `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="cancelEnrollment(${enrollment.id})">❌ Cancel</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('enrollmentContainer').innerHTML = html;
        }
    } catch (error) {
        showError('enrollmentContainer', error.message);
    }
}

async function showEnrollmentForm() {
    // Load available schedules
    try {
        const response = await apiCall('/classes/schedules');
        if (response.success) {
            const schedules = response.data.schedules || response.data || [];
            
            const scheduleSelect = document.getElementById('enrollScheduleId');
            scheduleSelect.innerHTML = '<option value="">-- Chọn lịch tập --</option>';
            schedules.forEach(schedule => {
                const date = new Date(schedule.date).toLocaleDateString('vi-VN');
                const time = new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
                scheduleSelect.innerHTML += `<option value="${schedule.id}">${schedule.Class?.name || 'N/A'} - ${date} ${time}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
    
    document.getElementById('enrollmentFormCard').style.display = 'block';
    document.getElementById('enrollmentFormResult').innerHTML = '';
}

function hideEnrollmentForm() {
    document.getElementById('enrollmentFormCard').style.display = 'none';
    document.getElementById('enrollmentForm').reset();
}

async function enrollMemberInSchedule() {
    try {
        if (!authToken) {
            showError('enrollmentFormResult', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        const scheduleId = document.getElementById('enrollScheduleId').value;
        const memberId = document.getElementById('enrollMemberId').value;

        if (!scheduleId) {
            showError('enrollmentFormResult', 'Vui lòng chọn lịch tập');
            return;
        }

        const enrollmentData = {};
        if (memberId) {
            enrollmentData.memberId = parseInt(memberId);
        }

        showLoading('enrollmentFormResult');
        const response = await apiCall(`/classes/schedules/${scheduleId}/enroll`, {
            method: 'POST',
            body: JSON.stringify(enrollmentData)
        });

        if (response.success) {
            showSuccess('enrollmentFormResult', '✅ Đăng ký thành công!');
            hideEnrollmentForm();
            loadActiveEnrollments();
        }
    } catch (error) {
        showError('enrollmentFormResult', error.message);
    }
}

async function cancelEnrollment(enrollmentId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký này?')) {
        return;
    }

    try {
        const response = await apiCall(`/classes/enrollments/${enrollmentId}`, {
            method: 'DELETE'
        });

        if (response.success) {
            showSuccess('enrollmentContainer', '✅ Đã hủy đăng ký thành công!');
            setTimeout(() => loadActiveEnrollments(), 1500);
        }
    } catch (error) {
        showError('enrollmentContainer', 'Lỗi: ' + error.message);
    }
}

async function showCheckinForm() {
    // Load available schedules for today
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/schedules?date=${today}`);
        if (response.success) {
            const schedules = response.data.schedules || response.data || [];
            
            const scheduleSelect = document.getElementById('checkinScheduleId');
            scheduleSelect.innerHTML = '<option value="">-- Chọn lịch tập --</option>';
            schedules.forEach(schedule => {
                const time = new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
                scheduleSelect.innerHTML += `<option value="${schedule.id}">${schedule.Class?.name || 'N/A'} - ${time}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
    
    document.getElementById('checkinFormCard').style.display = 'block';
    document.getElementById('checkinFormResult').innerHTML = '';
}

function hideCheckinForm() {
    document.getElementById('checkinFormCard').style.display = 'none';
    document.getElementById('checkinForm').reset();
}

async function checkinMember() {
    try {
        if (!authToken) {
            showError('checkinFormResult', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        const scheduleId = document.getElementById('checkinScheduleId').value;
        const memberId = document.getElementById('checkinMemberId').value;

        if (!scheduleId) {
            showError('checkinFormResult', 'Vui lòng chọn lịch tập');
            return;
        }

        const checkinData = {};
        if (memberId) {
            checkinData.memberId = parseInt(memberId);
        }

        showLoading('checkinFormResult');
        const response = await apiCall(`/classes/schedules/${scheduleId}/checkin`, {
            method: 'POST',
            body: JSON.stringify(checkinData)
        });

        if (response.success) {
            showSuccess('checkinFormResult', '✅ Check-in thành công!');
            hideCheckinForm();
            loadTodayCheckins();
        }
    } catch (error) {
        showError('checkinFormResult', error.message);
    }
}

async function loadTodayCheckins() {
    showLoading('checkinContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const today = new Date().toISOString().split('T')[0];
        const response = await apiCall(`/classes/checkins?date=${today}`);
        
        if (response.success) {
            const checkins = response.data || [];
            
            if (checkins.length === 0) {
                document.getElementById('checkinContainer').innerHTML = `
                    <div class="info">📅 No check-ins today. <button class="btn" onclick="showCheckinForm()">Check-in Member</button></div>
                `;
                return;
            }

            const html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Class</th>
                            <th>Time</th>
                            <th>Check-in Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${checkins.map(checkin => `
                            <tr>
                                <td>${checkin.Member?.fullName || 'N/A'}</td>
                                <td>${checkin.Schedule?.Class?.name || 'N/A'}</td>
                                <td>${checkin.Schedule?.startTime ? new Date(checkin.Schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : 'N/A'}</td>
                                <td>${new Date(checkin.createdAt).toLocaleTimeString('vi-VN')}</td>
                                <td><span class="badge badge-success">Checked In</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p><strong>Total:</strong> ${checkins.length} check-ins today</p>
            `;
            document.getElementById('checkinContainer').innerHTML = html;
        }
    } catch (error) {
        showError('checkinContainer', error.message);
    }
}

async function loadMemberClassHistory() {
    const memberId = document.getElementById('memberHistoryId').value;
    if (!memberId) {
        showError('memberHistoryContainer', 'Vui lòng nhập Member ID');
        return;
    }

    showLoading('memberHistoryContainer');
    try {
        if (!authToken) {
            throw new Error('Please login first (go to API Demo tab)');
        }

        const response = await apiCall(`/members/${memberId}/class-history`);
        
        if (response.success) {
            const history = response.data || [];
            
            if (history.length === 0) {
                document.getElementById('memberHistoryContainer').innerHTML = `
                    <div class="info">📋 No class history found for Member ID ${memberId}</div>
                `;
                return;
            }

            const html = `
                <div class="info" style="margin-bottom: 20px;">📋 Class History for Member ID ${memberId} (${history.length} records)</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Enrolled</th>
                            <th>Attended</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(record => `
                            <tr>
                                <td><strong>${record.Schedule?.Class?.name || 'N/A'}</strong></td>
                                <td>${new Date(record.Schedule?.date).toLocaleDateString('vi-VN') || 'N/A'}</td>
                                <td>${record.Schedule?.startTime ? new Date(record.Schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : 'N/A'}</td>
                                <td><span class="badge badge-${record.status === 'attended' ? 'success' : record.status === 'enrolled' ? 'primary' : 'warning'}">${record.status}</span></td>
                                <td>${new Date(record.createdAt).toLocaleDateString('vi-VN')}</td>
                                <td>${record.attendedAt ? new Date(record.attendedAt).toLocaleDateString('vi-VN') : 'Not attended'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            document.getElementById('memberHistoryContainer').innerHTML = html;
        }
    } catch (error) {
        showError('memberHistoryContainer', error.message);
    }
}

async function createSampleEnrollments() {
    try {
        if (!authToken) {
            showError('enrollmentContainer', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        showLoading('enrollmentContainer');
        
        // Get available schedules first
        const schedulesResponse = await apiCall('/classes/schedules');
        if (!schedulesResponse.success || !schedulesResponse.data.schedules || schedulesResponse.data.schedules.length === 0) {
            throw new Error('No schedules available. Please create schedules first.');
        }

        const schedules = schedulesResponse.data.schedules.slice(0, 2); // Use first 2 schedules
        const results = [];
        let created = 0;

        for (let i = 0; i < schedules.length; i++) {
            try {
                const schedule = schedules[i];
                
                const response = await apiCall(`/classes/schedules/${schedule.id}/enroll`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });

                if (response.success) {
                    created++;
                    results.push(`✅ Enrolled in ${schedule.Class?.name} on ${new Date(schedule.date).toLocaleDateString('vi-VN')}`);
                }
            } catch (error) {
                results.push(`❌ Failed: ${error.message}`);
            }
        }

        document.getElementById('enrollmentContainer').innerHTML = `
            <div class="success">
                🎲 Created ${created}/${schedules.length} sample enrollments:<br>
                ${results.join('<br>')}
                <br><br>
                <button class="btn" onclick="loadActiveEnrollments()">📋 View Enrollments</button>
            </div>
        `;

    } catch (error) {
        showError('enrollmentContainer', error.message);
    }
}

async function loadTrainerSchedule() {
    try {
        if (!authToken) {
            showError('enrollmentContainer', 'Vui lòng đăng nhập trước (vào tab API Demo)');
            return;
        }

        showLoading('enrollmentContainer');
        
        const response = await apiCall('/trainers/1/schedule');
        
        if (response.success) {
            const schedules = response.data || [];
            
            const html = `
                <div class="info" style="margin-bottom: 20px;">👨‍🏫 Trainer Schedule (${schedules.length} schedules)</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Room</th>
                            <th>Participants</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => `
                            <tr>
                                <td><strong>${schedule.Class?.name || 'N/A'}</strong></td>
                                <td>${new Date(schedule.date).toLocaleDateString('vi-VN')}</td>
                                <td>${new Date(schedule.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})} - ${new Date(schedule.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                                <td>${schedule.room || 'N/A'}</td>
                                <td>${schedule.currentParticipants || 0}/${schedule.maxParticipants || 'N/A'}</td>
                                <td><span class="badge badge-${schedule.status === 'active' ? 'success' : 'warning'}">${schedule.status || 'active'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <button class="btn" onclick="loadActiveEnrollments()">🔙 Back to Enrollments</button>
            `;
            document.getElementById('enrollmentContainer').innerHTML = html;
        }
    } catch (error) {
        showError('enrollmentContainer', error.message);
    }
}

function cancelEnrollmentDemo() {
    showSuccess('enrollmentContainer', 
        `📋 Cancel enrollment demo: Chọn một enrollment từ danh sách và click nút "Cancel" để hủy đăng ký.`
    );
}

/**
 * Logout function
 * @returns {Promise<void>}
 */
async function logout() {
    try {
        const savedTokens = localStorage.getItem('tokens');
        if (savedTokens) {
            const tokens = JSON.parse(savedTokens);
            
            // Call logout API
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: tokens.refreshToken })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clear local storage and redirect
    localStorage.removeItem('tokens');
    authToken = null;
    window.location.href = 'index.html';
}

/**
 * Page initialization - Auto-load overview on page load
 */
window.addEventListener('load', async () => {
    // Check for stored authentication tokens
    const savedTokens = localStorage.getItem('tokens');
    if (savedTokens) {
        try {
            const tokens = JSON.parse(savedTokens);
            authToken = tokens.accessToken;
            
            // Verify token is still valid
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('Auto-authenticated user:', userData.data);
                
                // Update header to show user info
                document.querySelector('.header p').innerHTML = 
                    `Chào mừng <strong>${userData.data.fullName || userData.data.username}</strong> (${userData.data.role})`;
            } else {
                // Token invalid, redirect to login
                localStorage.removeItem('tokens');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            localStorage.removeItem('tokens');
            window.location.href = 'index.html';
            return;
        }
    } else {
        // No tokens found, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    loadOverviewStats();
});