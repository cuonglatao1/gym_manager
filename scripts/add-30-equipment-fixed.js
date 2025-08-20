const { Equipment } = require('../models');

// 30 thiết bị gym đa dạng với schema đúng
const equipmentData = [
    // Cardio Equipment
    { name: 'Máy chạy bộ Technogym Run Personal', category: 'cardio', equipmentSize: 'large', priority: 'high', brand: 'Technogym', model: 'Run Personal', serialNumber: 'TG-RP-001', purchaseDate: '2023-01-15', purchasePrice: 95000000, status: 'active', location: 'Khu vực Cardio A', notes: 'Máy chạy bộ cao cấp với màn hình cảm ứng' },
    { name: 'Xe đạp tập Life Fitness IC7', category: 'cardio', equipmentSize: 'large', priority: 'high', brand: 'Life Fitness', model: 'IC7', serialNumber: 'LF-IC7-002', purchaseDate: '2023-02-10', purchasePrice: 45000000, status: 'active', location: 'Khu vực Cardio A', notes: 'Xe đạp tập thể dục nhóm' },
    { name: 'Máy chạy bộ Matrix T3x', category: 'cardio', equipmentSize: 'large', priority: 'high', brand: 'Matrix', model: 'T3x', serialNumber: 'MTX-T3X-003', purchaseDate: '2023-01-20', purchasePrice: 85000000, status: 'active', location: 'Khu vực Cardio B', notes: 'Máy chạy bộ thương mại' },
    { name: 'Máy tập elliptical Precor EFX 835', category: 'cardio', equipmentSize: 'large', priority: 'high', brand: 'Precor', model: 'EFX 835', serialNumber: 'PC-EFX-004', purchaseDate: '2023-02-05', purchasePrice: 92000000, status: 'active', location: 'Khu vực Cardio A', notes: 'Máy tập elliptical cao cấp' },
    { name: 'Xe đạp tập NordicTrack S22i', category: 'cardio', equipmentSize: 'large', priority: 'medium', brand: 'NordicTrack', model: 'S22i', serialNumber: 'NT-S22I-005', purchaseDate: '2023-03-01', purchasePrice: 52000000, status: 'active', location: 'Khu vực Cardio B', notes: 'Xe đạp tập với màn hình 22 inch' },
    { name: 'Máy chèo thuyền Concept2 Model D', category: 'cardio', equipmentSize: 'large', priority: 'medium', brand: 'Concept2', model: 'Model D PM5', serialNumber: 'C2-MD-028', purchaseDate: '2023-04-20', purchasePrice: 42000000, status: 'active', location: 'Khu vực Cardio A', notes: 'Máy chèo thuyền với màn hình PM5' },
    { name: 'Máy tập SkiErg Concept2', category: 'cardio', equipmentSize: 'large', priority: 'medium', brand: 'Concept2', model: 'SkiErg PM5', serialNumber: 'C2-SE-027', purchaseDate: '2023-04-15', purchasePrice: 35000000, status: 'active', location: 'Khu vực Cardio B', notes: 'Máy mô phỏng trượt tuyết' },
    { name: 'Máy tập Assault Bike', category: 'cardio', equipmentSize: 'large', priority: 'medium', brand: 'Assault Fitness', model: 'AirBike Classic', serialNumber: 'AF-AB-029', purchaseDate: '2023-04-25', purchasePrice: 48000000, status: 'active', location: 'Khu vực CrossFit', notes: 'Xe đạp tập cường độ cao' },

    // Strength Equipment
    { name: 'Ghế đẩy ngực Hammer Strength', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'Hammer Strength', model: 'ISO-Lateral Bench Press', serialNumber: 'HS-BP-006', purchaseDate: '2023-01-25', purchasePrice: 68000000, status: 'active', location: 'Khu vực Tạ tự do', notes: 'Ghế đẩy ngực chuyên nghiệp' },
    { name: 'Máy kéo xà Assisted Pull-up', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'Cybex', model: 'VR3 Assisted Pull-up', serialNumber: 'CX-VR3-007', purchaseDate: '2023-02-15', purchasePrice: 42000000, status: 'active', location: 'Khu vực Tạ máy', notes: 'Máy hỗ trợ kéo xà' },
    { name: 'Máy đẩy vai Life Fitness Signature', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'Life Fitness', model: 'Signature Shoulder Press', serialNumber: 'LF-SIG-008', purchaseDate: '2023-02-20', purchasePrice: 58000000, status: 'active', location: 'Khu vực Tạ máy', notes: 'Máy đẩy vai với góc điều chỉnh' },
    { name: 'Smith Machine Power Rack', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'Hoist Fitness', model: 'CF-3753', serialNumber: 'HF-SM-009', purchaseDate: '2023-01-30', purchasePrice: 75000000, status: 'active', location: 'Khu vực Tạ tự do', notes: 'Smith Machine với thanh an toàn' },
    { name: 'Máy Lat Pulldown Matrix', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'Matrix', model: 'G3-S20', serialNumber: 'MTX-LP-010', purchaseDate: '2023-03-10', purchasePrice: 54000000, status: 'active', location: 'Khu vực Tạ máy', notes: 'Máy kéo lat với multiple grip' },
    { name: 'Máy leg press 45 độ', category: 'strength', equipmentSize: 'large', priority: 'medium', brand: 'TRX', model: 'LP-45', serialNumber: 'TRX-LP-011', purchaseDate: '2023-03-15', purchasePrice: 62000000, status: 'active', location: 'Khu vực Tạ máy', notes: 'Máy đẩy chân góc 45 độ' },

    // Free Weights
    { name: 'Bộ tạ đơn Rubber Hex 5-50kg', category: 'free_weights', equipmentSize: 'small', priority: 'low', brand: 'Rogue Fitness', model: 'Rubber Hex Dumbbells', serialNumber: 'RF-RHD-012', purchaseDate: '2023-01-10', purchasePrice: 95000000, status: 'active', location: 'Khu vực Tạ tự do', notes: 'Bộ tạ đơn bọc cao su từ 5-50kg' },
    { name: 'Olympic Barbell 20kg', category: 'free_weights', equipmentSize: 'small', priority: 'low', brand: 'Eleiko', model: 'Sport Training Bar', serialNumber: 'EL-STB-013', purchaseDate: '2023-01-12', purchasePrice: 28000000, status: 'active', location: 'Khu vực Tạ tự do', notes: 'Thanh tạ Olympic chuyên nghiệp 2.2m' },
    { name: 'Bộ đĩa tạ Olympic 200kg', category: 'free_weights', equipmentSize: 'small', priority: 'low', brand: 'Rogue Fitness', model: 'Hi-Temp Bumper Plates', serialNumber: 'RF-HTP-014', purchaseDate: '2023-01-15', purchasePrice: 65000000, status: 'active', location: 'Khu vực Tạ tự do', notes: 'Bộ đĩa tạ cao su 10kg-25kg' },
    { name: 'Kettlebell Set 8-48kg', category: 'free_weights', equipmentSize: 'small', priority: 'low', brand: 'Dragon Door', model: 'RKC Kettlebells', serialNumber: 'DD-RKC-015', purchaseDate: '2023-02-01', purchasePrice: 38000000, status: 'active', location: 'Khu vực Functional', notes: 'Bộ tạ ấm chuyên nghiệp 8-48kg' },
    { name: 'Medicine Ball Set 2-12kg', category: 'free_weights', equipmentSize: 'small', priority: 'low', brand: 'Dynamax', model: 'Medicine Balls', serialNumber: 'DX-MB-016', purchaseDate: '2023-02-10', purchasePrice: 18000000, status: 'active', location: 'Khu vực Functional', notes: 'Bộ bóng tập 6 quả từ 2-12kg' },

    // Functional Training
    { name: 'Máy kéo cáp CrossFit Rig', category: 'functional', equipmentSize: 'large', priority: 'medium', brand: 'Rogue Fitness', model: 'R-6 Monster Rack', serialNumber: 'RF-R6-017', purchaseDate: '2023-02-25', purchasePrice: 85000000, status: 'active', location: 'Khu vực CrossFit', notes: 'Khung CrossFit đa năng với 12 điểm kết nối' },
    { name: 'Battle Rope 15m x 5cm', category: 'functional', equipmentSize: 'small', priority: 'low', brand: 'Rep Fitness', model: 'Battle Ropes', serialNumber: 'REP-BR-018', purchaseDate: '2023-03-01', purchasePrice: 8500000, status: 'active', location: 'Khu vực Functional', notes: 'Dây tập thể lực 15m đường kính 5cm' },
    { name: 'Plyo Box Set 20-30-36 inch', category: 'functional', equipmentSize: 'small', priority: 'low', brand: 'Yes4All', model: 'Foam Plyo Box', serialNumber: 'Y4A-PB-019', purchaseDate: '2023-03-05', purchasePrice: 12000000, status: 'active', location: 'Khu vực Functional', notes: 'Bộ 3 hộp nhảy cao khác nhau' },
    { name: 'Máy kéo cáp Functional Trainer', category: 'functional', equipmentSize: 'large', priority: 'medium', brand: 'Freemotion', model: 'EXT Dual Cable Cross', serialNumber: 'FM-EXT-020', purchaseDate: '2023-02-28', purchasePrice: 88000000, status: 'active', location: 'Khu vực Functional', notes: 'Máy kéo cáp đôi với 200 bài tập' },
    { name: 'TRX Suspension Trainer Pro 4', category: 'functional', equipmentSize: 'small', priority: 'low', brand: 'TRX', model: 'Pro Suspension Trainer', serialNumber: 'TRX-PST-021', purchaseDate: '2023-03-10', purchasePrice: 6500000, status: 'active', location: 'Khu vực Functional', notes: 'TRX Pro với phụ kiện đầy đủ' },
    { name: 'BOSU Ball Pro Balance Trainer', category: 'functional', equipmentSize: 'small', priority: 'low', brand: 'BOSU', model: 'NexGen Pro Balance Trainer', serialNumber: 'BOSU-NG-022', purchaseDate: '2023-04-30', purchasePrice: 18500000, status: 'active', location: 'Khu vực Functional', notes: 'Bóng cân bằng chuyên nghiệp 2 mặt' },

    // Accessories & Recovery
    { name: 'Máy massage gun Theragun Pro', category: 'accessories', equipmentSize: 'small', priority: 'low', brand: 'Therabody', model: 'Theragun Pro', serialNumber: 'TB-TGP-023', purchaseDate: '2023-03-15', purchasePrice: 15000000, status: 'active', location: 'Khu vực Recovery', notes: 'Súng massage chuyên nghiệp 5 đầu massage' },
    { name: 'Foam Roller Set High Density', category: 'accessories', equipmentSize: 'small', priority: 'low', brand: 'Gaiam', model: 'Restore Foam Roller', serialNumber: 'GA-RFR-024', purchaseDate: '2023-03-20', purchasePrice: 5500000, status: 'active', location: 'Khu vực Recovery', notes: 'Bộ 3 con lăn massage khác độ cứng' },
    { name: 'Ghế massage toàn thân Osaki', category: 'accessories', equipmentSize: 'large', priority: 'low', brand: 'Osaki', model: 'OS-4000T', serialNumber: 'OS-4000T-025', purchaseDate: '2023-04-05', purchasePrice: 95000000, status: 'active', location: 'Khu vực VIP', notes: 'Ghế massage cao cấp với 5 chương trình' },
    { name: 'Máy đo thành phần cơ thể InBody', category: 'other', equipmentSize: 'large', priority: 'low', brand: 'InBody', model: '970', serialNumber: 'IB-970-026', purchaseDate: '2023-04-01', purchasePrice: 85000000, status: 'active', location: 'Phòng tư vấn', notes: 'Máy đo thành phần cơ thể chuyên nghiệp' }
];

async function addEquipment() {
    try {
        console.log('🏋️‍♂️ Bắt đầu thêm 30 thiết bị gym...');
        
        // Kiểm tra xem có thiết bị nào đã tồn tại không
        const existingEquipment = await Equipment.findAll();
        console.log(`📊 Hiện tại có ${existingEquipment.length} thiết bị trong database`);
        
        let addedCount = 0;
        
        for (const equipment of equipmentData) {
            // Kiểm tra xem thiết bị đã tồn tại chưa (theo serial number)
            const exists = await Equipment.findOne({
                where: { serialNumber: equipment.serialNumber }
            });
            
            if (!exists) {
                await Equipment.create(equipment);
                addedCount++;
                console.log(`✅ Đã thêm: ${equipment.name}`);
            } else {
                console.log(`⚠️  Đã tồn tại: ${equipment.name}`);
            }
        }
        
        console.log(`\n🎯 Kết quả:`);
        console.log(`✅ Đã thêm ${addedCount} thiết bị mới`);
        console.log(`📊 Tổng thiết bị hiện tại: ${existingEquipment.length + addedCount}`);
        
        // Thống kê theo loại
        const finalEquipment = await Equipment.findAll();
        const stats = {};
        finalEquipment.forEach(eq => {
            stats[eq.category] = (stats[eq.category] || 0) + 1;
        });
        
        console.log(`\n📈 Thống kê theo loại thiết bị:`);
        Object.entries(stats).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} thiết bị`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Lỗi khi thêm thiết bị:', error);
        process.exit(1);
    }
}

// Chạy script
addEquipment();