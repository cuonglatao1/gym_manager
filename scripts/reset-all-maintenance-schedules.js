const { MaintenanceSchedule, Equipment, MaintenanceHistory } = require('../models');

async function resetAllMaintenanceSchedules() {
    try {
        console.log('🧹 Bắt đầu reset tất cả lịch bảo trì...');
        
        // Đếm số lịch hiện tại
        const currentSchedules = await MaintenanceSchedule.findAll();
        console.log(`📊 Hiện tại có ${currentSchedules.length} lịch bảo trì trong database`);
        
        if (currentSchedules.length === 0) {
            console.log('✅ Không có lịch bảo trì nào để xóa');
            process.exit(0);
        }
        
        // Hiển thị thống kê trước khi xóa
        const stats = {};
        currentSchedules.forEach(schedule => {
            const type = schedule.maintenanceType || 'unknown';
            stats[type] = (stats[type] || 0) + 1;
        });
        
        console.log('📈 Thống kê lịch hiện tại:');
        Object.entries(stats).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} lịch`);
        });
        
        // Xác nhận xóa
        console.log('\n⚠️  Chuẩn bị xóa TẤT CẢ lịch bảo trì hiện tại...');
        
        // Xóa maintenance history trước (vì có foreign key constraint)
        console.log('🗑️ Đang xóa lịch sử bảo trì...');
        const historyCount = await MaintenanceHistory.count();
        if (historyCount > 0) {
            await MaintenanceHistory.destroy({ where: {} });
            console.log(`   ✅ Đã xóa ${historyCount} record lịch sử bảo trì`);
        }
        
        // Sau đó xóa maintenance schedules
        console.log('🗑️ Đang xóa lịch bảo trì...');
        const deletedCount = await MaintenanceSchedule.destroy({
            where: {}
        });
        
        console.log(`✅ Đã xóa thành công ${currentSchedules.length} lịch bảo trì`);
        
        // Kiểm tra lại
        const remainingSchedules = await MaintenanceSchedule.findAll();
        console.log(`📊 Còn lại: ${remainingSchedules.length} lịch trong database`);
        
        if (remainingSchedules.length === 0) {
            console.log('🎉 Database đã được làm sạch hoàn toàn!');
            console.log('\n💡 Bây giờ bạn có thể:');
            console.log('   1. Tạo lịch bảo trì mới cho từng thiết bị');
            console.log('   2. Sử dụng script setup-automatic-maintenance-system.js để tạo lịch tự động');
            console.log('   3. Không có thông báo "quá hạn" nào nữa');
        } else {
            console.log('⚠️  Vẫn còn một số lịch chưa được xóa');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Lỗi khi reset lịch bảo trì:', error);
        process.exit(1);
    }
}

// Chạy script
console.log('🔄 Script Reset Maintenance Schedules');
console.log('=====================================');
resetAllMaintenanceSchedules();