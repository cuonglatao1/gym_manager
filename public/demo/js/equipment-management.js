// Equipment Management JavaScript
// Các chức năng quản lý thiết bị, lịch bảo trì và lịch sử

// Load equipment list
async function loadEquipment(page = 1) {
    try {
        const filters = getEquipmentFilters();
        const queryParams = new URLSearchParams({
            page: page,
            limit: itemsPerPage,
            ...filters
        });

        const response = await apiCall(`/api/equipment?${queryParams}`, 'GET');
        
        if (response.success) {
            displayEquipment(response.data.equipment);
            updateEquipmentPagination(response.data.pagination);
        } else {
            showError('Không thể tải danh sách thiết bị');
        }
    } catch (error) {
        console.error('Error loading equipment:', error);
        showError('Lỗi khi tải danh sách thiết bị');
    }
}

// Get equipment filters
function getEquipmentFilters() {
    return {
        search: document.getElementById('equipment-search')?.value || '',
        category: document.getElementById('equipment-category')?.value || '',
        priority: document.getElementById('equipment-priority')?.value || '',
        status: document.getElementById('equipment-status')?.value || ''
    };
}

// Display equipment grid
function displayEquipment(equipment) {
    const grid = document.getElementById('equipment-grid');
    
    if (!equipment || equipment.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Không có thiết bị nào</p>';
        return;
    }

    grid.innerHTML = equipment.map(item => `
        <div class="equipment-card ${item.priority}-priority">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <div class="equipment-code">${item.equipmentCode}</div>
            </div>
            
            <div class="equipment-details">
                <div class="equipment-detail">
                    <span>Loại:</span>
                    <span>${getCategoryText(item.category)}</span>
                </div>
                <div class="equipment-detail">
                    <span>Vị trí:</span>
                    <span>${item.location || 'Chưa xác định'}</span>
                </div>
                <div class="equipment-detail">
                    <span>Mức độ ưu tiên:</span>
                    <span class="priority-badge priority-${item.priority}">${getPriorityText(item.priority)}</span>
                </div>
                <div class="equipment-detail">
                    <span>Trạng thái:</span>
                    <span class="status-badge status-${item.status}">${getStatusText(item.status)}</span>
                </div>
                <div class="equipment-detail">
                    <span>Lần bảo trì cuối:</span>
                    <span>${formatDate(item.lastMaintenanceDate) || 'Chưa có'}</span>
                </div>
                <div class="equipment-detail">
                    <span>Lần bảo trì tiếp theo:</span>
                    <span>${formatDate(item.nextMaintenanceDate) || 'Chưa xác định'}</span>
                </div>
            </div>

            ${getMaintenanceSchedulePreview(item.id)}

            <div class="equipment-actions">
                <button class="btn btn-sm btn-primary" onclick="viewEquipmentDetails(${item.id})">
                    👁️ Chi tiết
                </button>
                <button class="btn btn-sm btn-success" onclick="viewEquipmentSchedules(${item.id})">
                    📅 Lịch BT
                </button>
                <button class="btn btn-sm btn-warning" onclick="createMaintenanceTask(${item.id})">
                    🔧 Tạo CV
                </button>
                <button class="btn btn-sm btn-danger" onclick="editEquipment(${item.id})">
                    ✏️ Sửa
                </button>
            </div>
        </div>
    `).join('');
}

// Get maintenance schedule preview for equipment card
function getMaintenanceSchedulePreview(equipmentId) {
    // This would be loaded separately or included in equipment data
    return `
        <div class="maintenance-schedule">
            <strong>Lịch bảo trì tự động:</strong>
            <div class="schedule-item">
                <span class="schedule-type">Vệ sinh</span>
                <span class="schedule-next">Loading...</span>
            </div>
        </div>
    `;
}

// Get category text
function getCategoryText(category) {
    const categories = {
        'cardio': 'Cardio',
        'strength': 'Sức mạnh',
        'functional': 'Chức năng',
        'free_weights': 'Tạ tự do',
        'accessories': 'Phụ kiện',
        'other': 'Khác'
    };
    return categories[category] || category;
}

// Update equipment pagination
function updateEquipmentPagination(pagination) {
    const container = document.getElementById('equipment-pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // Previous button
    html += `<button onclick="loadEquipment(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>‹ Trước</button>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        html += `<button onclick="loadEquipment(${i})" ${i === pagination.page ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadEquipment(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Sau ›</button>`;
    
    container.innerHTML = html;
}

// Filter equipment
function filterEquipment() {
    loadEquipment(1); // Reset to page 1 when filtering
}

// Add equipment form submission
document.getElementById('add-equipment-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('equipment-name').value,
            category: document.getElementById('equipment-category-input').value,
            priority: document.getElementById('equipment-priority-input').value,
            equipmentSize: document.getElementById('equipment-size-input').value,
            brand: document.getElementById('equipment-brand').value,
            model: document.getElementById('equipment-model').value,
            purchaseDate: document.getElementById('equipment-purchase-date').value,
            purchasePrice: document.getElementById('equipment-price').value,
            location: document.getElementById('equipment-location').value,
            notes: document.getElementById('equipment-notes').value
        };

        const response = await apiCall('/api/equipment', 'POST', formData);
        
        if (response.success) {
            showSuccess('Thiết bị đã được thêm thành công!');
            closeModal('add-equipment-modal');
            loadEquipment(); // Reload equipment list
            loadDashboard(); // Refresh dashboard stats
            
            // Reset form
            document.getElementById('add-equipment-form').reset();
        } else {
            showError(response.message || 'Không thể thêm thiết bị');
        }
    } catch (error) {
        console.error('Error adding equipment:', error);
        showError('Lỗi khi thêm thiết bị');
    }
});

// Load maintenance schedules
async function loadSchedules(page = 1) {
    try {
        const filters = getScheduleFilters();
        const queryParams = new URLSearchParams({
            page: page,
            limit: itemsPerPage,
            ...filters
        });

        const response = await apiCall(`/api/maintenance-schedules?${queryParams}`, 'GET');
        
        if (response.success) {
            displaySchedules(response.data.schedules);
            updateSchedulesPagination(response.data.pagination);
        } else {
            showError('Không thể tải lịch bảo trì');
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        showError('Lỗi khi tải lịch bảo trì');
    }
}

// Get schedule filters
function getScheduleFilters() {
    return {
        maintenanceType: document.getElementById('schedule-type')?.value || '',
        priority: document.getElementById('schedule-priority')?.value || '',
        isActive: document.getElementById('schedule-active')?.value || ''
    };
}

// Display schedules table
function displaySchedules(schedules) {
    const tbody = document.getElementById('schedules-tbody');
    
    if (!schedules || schedules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; padding: 40px;">Không có lịch bảo trì nào</td></tr>';
        return;
    }

    tbody.innerHTML = schedules.map(schedule => `
        <tr>
            <td>${schedule.equipment?.name || 'N/A'}</td>
            <td>${getMaintenanceTypeText(schedule.maintenanceType)}</td>
            <td>Mỗi ${schedule.intervalDays} ngày</td>
            <td>${formatDate(schedule.lastCompletedDate) || 'Chưa có'}</td>
            <td class="${isOverdue(schedule.nextDueDate) ? 'text-danger' : ''}">${formatDate(schedule.nextDueDate)}</td>
            <td><span class="priority-badge priority-${schedule.priority}">${getPriorityText(schedule.priority)}</span></td>
            <td><span class="status-badge ${schedule.isActive ? 'status-active' : 'status-retired'}">${schedule.isActive ? 'Hoạt động' : 'Tạm dừng'}</span></td>
            <td>
                <button class="btn btn-sm btn-success" onclick="generateTaskFromSchedule(${schedule.id})">
                    🔧 Tạo CV
                </button>
                <button class="btn btn-sm btn-warning" onclick="editSchedule(${schedule.id})">
                    ✏️ Sửa
                </button>
                <button class="btn btn-sm ${schedule.isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleSchedule(${schedule.id}, ${!schedule.isActive})">
                    ${schedule.isActive ? '⏸️ Dừng' : '▶️ Kích hoạt'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Check if date is overdue
function isOverdue(dateString) {
    if (!dateString) return false;
    const today = new Date();
    const dueDate = new Date(dateString);
    return dueDate < today;
}

// Update schedules pagination
function updateSchedulesPagination(pagination) {
    const container = document.getElementById('schedules-pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // Previous button
    html += `<button onclick="loadSchedules(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>‹ Trước</button>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        html += `<button onclick="loadSchedules(${i})" ${i === pagination.page ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadSchedules(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Sau ›</button>`;
    
    container.innerHTML = html;
}

// Load maintenance tasks
async function loadMaintenance(page = 1) {
    try {
        const filters = getMaintenanceFilters();
        const queryParams = new URLSearchParams({
            page: page,
            limit: itemsPerPage,
            ...filters
        });

        const response = await apiCall(`/api/equipment-maintenance?${queryParams}`, 'GET');
        
        if (response.success) {
            displayMaintenance(response.data.maintenance);
            updateMaintenancePagination(response.data.pagination);
        } else {
            showError('Không thể tải công việc bảo trì');
        }
    } catch (error) {
        console.error('Error loading maintenance:', error);
        showError('Lỗi khi tải công việc bảo trì');
    }
}

// Get maintenance filters
function getMaintenanceFilters() {
    return {
        status: document.getElementById('maintenance-status')?.value || '',
        maintenanceType: document.getElementById('maintenance-type')?.value || '',
        assignedTo: document.getElementById('maintenance-assignee')?.value || ''
    };
}

// Display maintenance table
function displayMaintenance(maintenance) {
    const tbody = document.getElementById('maintenance-tbody');
    
    if (!maintenance || maintenance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 40px;">Không có công việc bảo trì nào</td></tr>';
        return;
    }

    tbody.innerHTML = maintenance.map(task => `
        <tr>
            <td>${task.equipment?.name || 'N/A'}</td>
            <td>${getMaintenanceTypeText(task.maintenanceType)}</td>
            <td class="${isOverdue(task.scheduledDate) ? 'text-danger' : ''}">${formatDate(task.scheduledDate)}</td>
            <td>${task.assignee?.fullName || task.assignee?.username || 'Chưa phân công'}</td>
            <td><span class="priority-badge priority-${task.priority}">${getPriorityText(task.priority)}</span></td>
            <td><span class="status-badge status-${task.status}">${getStatusText(task.status)}</span></td>
            <td>
                ${task.status === 'scheduled' ? `
                    <button class="btn btn-sm btn-primary" onclick="startMaintenance(${task.id})">
                        ▶️ Bắt đầu
                    </button>
                ` : ''}
                ${task.status === 'in_progress' ? `
                    <button class="btn btn-sm btn-success" onclick="completeMaintenance(${task.id})">
                        ✅ Hoàn thành
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-warning" onclick="editMaintenance(${task.id})">
                    ✏️ Sửa
                </button>
                ${task.status !== 'completed' && task.status !== 'cancelled' ? `
                    <button class="btn btn-sm btn-danger" onclick="cancelMaintenance(${task.id})">
                        ❌ Hủy
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Update maintenance pagination
function updateMaintenancePagination(pagination) {
    const container = document.getElementById('maintenance-pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // Previous button
    html += `<button onclick="loadMaintenance(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>‹ Trước</button>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        html += `<button onclick="loadMaintenance(${i})" ${i === pagination.page ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadMaintenance(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Sau ›</button>`;
    
    container.innerHTML = html;
}

// Load maintenance history
async function loadHistory(page = 1) {
    try {
        const filters = getHistoryFilters();
        const queryParams = new URLSearchParams({
            page: page,
            limit: itemsPerPage,
            ...filters
        });

        const response = await apiCall(`/api/maintenance-history?${queryParams}`, 'GET');
        
        if (response.success) {
            displayHistory(response.data.history);
            updateHistoryPagination(response.data.pagination);
        } else {
            showError('Không thể tải lịch sử bảo trì');
        }
    } catch (error) {
        console.error('Error loading history:', error);
        showError('Lỗi khi tải lịch sử bảo trì');
    }
}

// Get history filters
function getHistoryFilters() {
    return {
        startDate: document.getElementById('history-start-date')?.value || '',
        endDate: document.getElementById('history-end-date')?.value || '',
        equipmentId: document.getElementById('history-equipment')?.value || '',
        performedBy: document.getElementById('history-performer')?.value || ''
    };
}

// Display history table
function displayHistory(history) {
    const tbody = document.getElementById('history-tbody');
    
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #666; padding: 40px;">Không có lịch sử bảo trì nào</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(record => `
        <tr>
            <td>${formatDate(record.performedDate)}</td>
            <td>${record.equipment?.name || 'N/A'}</td>
            <td>${getMaintenanceTypeText(record.maintenanceType)}</td>
            <td>${record.performer?.fullName || record.performer?.username || 'N/A'}</td>
            <td>${formatCurrency(record.cost)}</td>
            <td>${record.duration ? record.duration + ' phút' : 'N/A'}</td>
            <td><span class="status-badge status-${record.result}">${getResultText(record.result)}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewHistoryDetails(${record.id})">
                    👁️ Chi tiết
                </button>
            </td>
        </tr>
    `).join('');
}

// Update history pagination
function updateHistoryPagination(pagination) {
    const container = document.getElementById('history-pagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // Previous button
    html += `<button onclick="loadHistory(${pagination.page - 1})" ${pagination.page <= 1 ? 'disabled' : ''}>‹ Trước</button>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        html += `<button onclick="loadHistory(${i})" ${i === pagination.page ? 'class="active"' : ''}>${i}</button>`;
    }
    
    // Next button
    html += `<button onclick="loadHistory(${pagination.page + 1})" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Sau ›</button>`;
    
    container.innerHTML = html;
}

// Load staff list for dropdowns
async function loadStaff() {
    try {
        const response = await apiCall('/api/debug/users', 'GET');
        
        if (response.success) {
            const staff = response.data.users.filter(user => 
                user.role === 'admin' || user.role === 'staff'
            );
            
            // Populate assignee dropdowns
            const assigneeSelect = document.getElementById('maintenance-assignee');
            const performerSelect = document.getElementById('history-performer');
            
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">Tất cả</option>' + 
                    staff.map(user => `<option value="${user.id}">${user.fullName || user.username}</option>`).join('');
            }
            
            if (performerSelect) {
                performerSelect.innerHTML = '<option value="">Tất cả</option>' + 
                    staff.map(user => `<option value="${user.id}">${user.fullName || user.username}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

// Load equipment list for dropdowns
async function loadEquipmentList() {
    try {
        const response = await apiCall('/api/equipment', 'GET');
        
        if (response.success) {
            const equipmentSelect = document.getElementById('history-equipment');
            
            if (equipmentSelect) {
                equipmentSelect.innerHTML = '<option value="">Tất cả thiết bị</option>' + 
                    response.data.equipment.map(equipment => 
                        `<option value="${equipment.id}">${equipment.name} (${equipment.equipmentCode})</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading equipment list:', error);
    }
}

// Scheduler actions
async function generateOverdueTasks() {
    try {
        const response = await apiCall('/api/maintenance-scheduler/generate-overdue-tasks', 'POST');
        
        if (response.success) {
            showSuccess(`Đã tạo ${response.data.length} công việc bảo trì quá hạn`);
            loadMaintenance();
            loadDashboard();
        } else {
            showError(response.message || 'Không thể tạo công việc quá hạn');
        }
    } catch (error) {
        console.error('Error generating overdue tasks:', error);
        showError('Lỗi khi tạo công việc quá hạn');
    }
}

async function generateUpcomingTasks() {
    try {
        const response = await apiCall('/api/maintenance-scheduler/generate-upcoming-tasks', 'POST', { days: 3 });
        
        if (response.success) {
            showSuccess(`Đã tạo ${response.data.length} công việc bảo trì sắp tới`);
            loadMaintenance();
            loadDashboard();
        } else {
            showError(response.message || 'Không thể tạo công việc sắp tới');
        }
    } catch (error) {
        console.error('Error generating upcoming tasks:', error);
        showError('Lỗi khi tạo công việc sắp tới');
    }
}

async function autoAssignTasks() {
    try {
        const response = await apiCall('/api/maintenance-scheduler/auto-assign-tasks', 'POST');
        
        if (response.success) {
            showSuccess(`Đã phân công ${response.data.length} công việc tự động`);
            loadMaintenance();
        } else {
            showError(response.message || 'Không thể phân công tự động');
        }
    } catch (error) {
        console.error('Error auto-assigning tasks:', error);
        showError('Lỗi khi phân công tự động');
    }
}

async function generateTaskFromSchedule(scheduleId) {
    try {
        const response = await apiCall(`/api/maintenance-schedules/${scheduleId}/generate-task`, 'POST');
        
        if (response.success) {
            showSuccess('Đã tạo công việc bảo trì từ lịch');
            loadMaintenance();
            loadDashboard();
        } else {
            showError(response.message || 'Không thể tạo công việc');
        }
    } catch (error) {
        console.error('Error generating task from schedule:', error);
        showError('Lỗi khi tạo công việc từ lịch');
    }
}

// Maintenance actions
async function startMaintenance(taskId) {
    try {
        const response = await apiCall(`/api/equipment-maintenance/${taskId}/start`, 'POST');
        
        if (response.success) {
            showSuccess('Đã bắt đầu công việc bảo trì');
            loadMaintenance();
        } else {
            showError(response.message || 'Không thể bắt đầu công việc');
        }
    } catch (error) {
        console.error('Error starting maintenance:', error);
        showError('Lỗi khi bắt đầu công việc');
    }
}

async function completeMaintenance(taskId) {
    try {
        // Get task info first
        const response = await apiCall(`/api/equipment-maintenance/${taskId}`, 'GET');
        
        if (response.success) {
            const task = response.data;
            
            // Populate form
            document.getElementById('complete-task-id').value = taskId;
            document.getElementById('complete-task-title').value = task.title || 'N/A';
            
            // Show modal
            document.getElementById('complete-maintenance-modal').style.display = 'flex';
        } else {
            showError('Không thể tải thông tin công việc');
        }
    } catch (error) {
        console.error('Error preparing maintenance completion:', error);
        showError('Lỗi khi chuẩn bị hoàn thành công việc');
    }
}

async function cancelMaintenance(taskId) {
    const reason = prompt('Lý do hủy:');
    
    if (reason) {
        try {
            const response = await apiCall(`/api/equipment-maintenance/${taskId}/cancel`, 'POST', { reason });
            
            if (response.success) {
                showSuccess('Đã hủy công việc bảo trì');
                loadMaintenance();
            } else {
                showError(response.message || 'Không thể hủy công việc');
            }
        } catch (error) {
            console.error('Error cancelling maintenance:', error);
            showError('Lỗi khi hủy công việc');
        }
    }
}

// Load reports
async function loadReports() {
    try {
        // Load cost analysis
        const costResponse = await apiCall('/api/maintenance-history/cost-analysis?period=month', 'GET');
        if (costResponse.success && costResponse.data.length > 0) {
            const currentMonth = costResponse.data[0];
            document.getElementById('total-cost').textContent = formatCurrency(currentMonth.totalCost);
        }

        // Load efficiency analysis
        const efficiencyResponse = await apiCall('/api/maintenance-history/analytics/efficiency', 'GET');
        if (efficiencyResponse.success && efficiencyResponse.data.length > 0) {
            const avgEfficiency = efficiencyResponse.data.reduce((sum, item) => sum + (item.efficiency || 0), 0) / efficiencyResponse.data.length;
            document.getElementById('avg-efficiency').textContent = Math.round(avgEfficiency) + '%';
        }

        // Load completed tasks count
        const maintenanceResponse = await apiCall('/api/equipment-maintenance?status=completed&limit=1', 'GET');
        if (maintenanceResponse.success) {
            document.getElementById('completed-tasks').textContent = maintenanceResponse.data.pagination?.total || 0;
        }

        // Load equipment reliability
        const reliabilityResponse = await apiCall('/api/maintenance-history/analytics/equipment-performance', 'GET');
        if (reliabilityResponse.success && reliabilityResponse.data.length > 0) {
            const avgReliability = reliabilityResponse.data.reduce((sum, item) => sum + (item.performanceScore || 0), 0) / reliabilityResponse.data.length;
            document.getElementById('equipment-reliability').textContent = Math.round(avgReliability) + '%';
        }

    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Lỗi khi tải báo cáo');
    }
}

// Export history
async function exportHistory() {
    try {
        const filters = getHistoryFilters();
        const queryParams = new URLSearchParams(filters);
        
        window.open(`/api/maintenance-history/export/csv?${queryParams}`, '_blank');
        showSuccess('Đang tải file CSV...');
    } catch (error) {
        console.error('Error exporting history:', error);
        showError('Lỗi khi xuất báo cáo');
    }
}

// View equipment details
async function viewEquipmentDetails(equipmentId) {
    try {
        document.getElementById('equipment-details-modal').style.display = 'flex';
        
        const response = await apiCall(`/api/equipment/${equipmentId}`, 'GET');
        
        if (response.success) {
            const equipment = response.data;
            
            document.getElementById('equipment-details-content').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Thông tin cơ bản</h4>
                        <div class="detail-item">
                            <span class="detail-label">Tên thiết bị:</span>
                            <span class="detail-value">${equipment.name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Mã thiết bị:</span>
                            <span class="detail-value">${equipment.equipmentCode}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Loại:</span>
                            <span class="detail-value">${getCategoryText(equipment.category)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Mức độ ưu tiên:</span>
                            <span class="detail-value">
                                <span class="priority-badge priority-${equipment.priority}">${getPriorityText(equipment.priority)}</span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Trạng thái:</span>
                            <span class="detail-value">
                                <span class="status-badge status-${equipment.status}">${getStatusText(equipment.status)}</span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tình trạng:</span>
                            <span class="detail-value">${equipment.condition}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Thông tin kỹ thuật</h4>
                        <div class="detail-item">
                            <span class="detail-label">Hãng:</span>
                            <span class="detail-value">${equipment.brand || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Model:</span>
                            <span class="detail-value">${equipment.model || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Serial Number:</span>
                            <span class="detail-value">${equipment.serialNumber || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Vị trí:</span>
                            <span class="detail-value">${equipment.location || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Kích thước:</span>
                            <span class="detail-value">${equipment.equipmentSize === 'large' ? 'Lớn' : 'Nhỏ'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Thông tin mua hàng</h4>
                        <div class="detail-item">
                            <span class="detail-label">Ngày mua:</span>
                            <span class="detail-value">${formatDate(equipment.purchaseDate) || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Giá mua:</span>
                            <span class="detail-value">${equipment.purchasePrice ? formatCurrency(equipment.purchasePrice) : 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Bảo hành đến:</span>
                            <span class="detail-value">${formatDate(equipment.warrantyEndDate) || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Số lần sử dụng:</span>
                            <span class="detail-value">${equipment.usageCount || 0}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Thông tin bảo trì</h4>
                        <div class="detail-item">
                            <span class="detail-label">Chu kỳ bảo trì:</span>
                            <span class="detail-value">${equipment.maintenanceInterval || 30} ngày</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Lần cuối bảo trì:</span>
                            <span class="detail-value">${formatDate(equipment.lastMaintenanceDate) || 'Chưa có'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Lần tiếp theo:</span>
                            <span class="detail-value ${isOverdue(equipment.nextMaintenanceDate) ? 'text-danger' : 'text-success'}">
                                ${formatDate(equipment.nextMaintenanceDate) || 'Chưa xác định'}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${equipment.notes ? `
                    <div class="detail-section">
                        <h4>Ghi chú</h4>
                        <p style="margin: 0; line-height: 1.5;">${equipment.notes}</p>
                    </div>
                ` : ''}
                
                ${equipment.specifications ? `
                    <div class="detail-section">
                        <h4>Thông số kỹ thuật</h4>
                        <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 0.9em; overflow-x: auto;">${JSON.stringify(equipment.specifications, null, 2)}</pre>
                    </div>
                ` : ''}
            `;
        } else {
            document.getElementById('equipment-details-content').innerHTML = '<p style="color: #dc3545;">Không thể tải thông tin thiết bị</p>';
        }
    } catch (error) {
        console.error('Error loading equipment details:', error);
        document.getElementById('equipment-details-content').innerHTML = '<p style="color: #dc3545;">Lỗi khi tải thông tin thiết bị</p>';
    }
}

function viewEquipmentSchedules(equipmentId) {
    console.log('View equipment schedules:', equipmentId);
    // TODO: Implement equipment schedules modal
}

async function createMaintenanceTask(equipmentId) {
    try {
        // Get equipment info first
        const response = await apiCall(`/api/equipment/${equipmentId}`, 'GET');
        
        if (response.success) {
            const equipment = response.data;
            
            // Populate form
            document.getElementById('task-equipment-id').value = equipmentId;
            document.getElementById('task-equipment-name').value = equipment.name + ' (' + equipment.equipmentCode + ')';
            
            // Load staff for assignment
            await loadStaffForTaskAssignment();
            
            // Show modal
            document.getElementById('create-task-modal').style.display = 'flex';
        } else {
            showError('Không thể tải thông tin thiết bị');
        }
    } catch (error) {
        console.error('Error preparing task creation:', error);
        showError('Lỗi khi chuẩn bị tạo công việc');
    }
}

async function loadStaffForTaskAssignment() {
    try {
        const response = await apiCall('/api/debug/users', 'GET');
        
        if (response.success) {
            const staff = response.data.users.filter(user => 
                user.role === 'admin' || user.role === 'staff'
            );
            
            const assigneeSelect = document.getElementById('task-assigned-to');
            if (assigneeSelect) {
                assigneeSelect.innerHTML = '<option value="">Chưa phân công</option>' + 
                    staff.map(user => `<option value="${user.id}">${user.fullName || user.username}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading staff for assignment:', error);
    }
}

function editEquipment(equipmentId) {
    console.log('Edit equipment:', equipmentId);
    // TODO: Implement equipment edit modal
}

function editSchedule(scheduleId) {
    console.log('Edit schedule:', scheduleId);
    // TODO: Implement schedule edit modal
}

function toggleSchedule(scheduleId, isActive) {
    console.log('Toggle schedule:', scheduleId, isActive);
    // TODO: Implement schedule toggle
}

function editMaintenance(taskId) {
    console.log('Edit maintenance:', taskId);
    // TODO: Implement maintenance edit modal
}

function viewHistoryDetails(recordId) {
    console.log('View history details:', recordId);
    // TODO: Implement history details modal
}

function showOverdueMaintenance() {
    document.getElementById('maintenance-status').value = 'scheduled';
    loadMaintenance();
}

function showUpcomingMaintenance() {
    document.getElementById('maintenance-status').value = 'scheduled';
    loadMaintenance();
}