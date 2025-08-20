const { Equipment } = require('../models');

// 30 thiết bị gym đa dạng
const equipmentData = [
    // Cardio Equipment (Thiết bị tim mạch)
    {
        name: 'Máy chạy bộ Technogym Run Personal',
        category: 'cardio',
        equipmentSize: 'large',
        priority: 'high',
        brand: 'Technogym',
        model: 'Run Personal',
        serialNumber: 'TG-RP-001',
        purchaseDate: '2023-01-15',
        purchasePrice: 95000000,
        status: 'active',
        location: 'Khu vực Cardio A',
        notes: 'Máy chạy bộ cao cấp với màn hình cảm ứng'
    },
    {
        name: 'Xe đạp tập Life Fitness IC7',
        type: 'Cardio',
        brand: 'Life Fitness',
        model: 'IC7',
        serialNumber: 'LF-IC7-002',
        purchaseDate: '2023-02-10',
        purchasePrice: 45000000,
        warrantyExpiry: '2026-02-10',
        status: 'active',
        location: 'Khu vực Cardio A',
        notes: 'Xe đạp tập thể dục nhóm với màn hình kết nối'
    },
    {
        name: 'Máy chạy bộ Matrix T3x',
        type: 'Cardio',
        brand: 'Matrix',
        model: 'T3x',
        serialNumber: 'MTX-T3X-003',
        purchaseDate: '2023-01-20',
        purchasePrice: 85000000,
        warrantyExpiry: '2026-01-20',
        status: 'active',
        location: 'Khu vực Cardio B',
        notes: 'Máy chạy bộ thương mại với hệ thống giảm chấn'
    },
    {
        name: 'Máy tập elliptical Precor EFX 835',
        type: 'Cardio',
        brand: 'Precor',
        model: 'EFX 835',
        serialNumber: 'PC-EFX-004',
        purchaseDate: '2023-02-05',
        purchasePrice: 92000000,
        warrantyExpiry: '2026-02-05',
        status: 'active',
        location: 'Khu vực Cardio A',
        notes: 'Máy tập elliptical cao cấp với 25 chương trình'
    },
    {
        name: 'Xe đạp tập NordicTrack S22i',
        type: 'Cardio',
        brand: 'NordicTrack',
        model: 'S22i',
        serialNumber: 'NT-S22I-005',
        purchaseDate: '2023-03-01',
        purchasePrice: 52000000,
        warrantyExpiry: '2026-03-01',
        status: 'active',
        location: 'Khu vực Cardio B',
        notes: 'Xe đạp tập với màn hình 22 inch và iFit'
    },

    // Strength Equipment (Thiết bị tạ)
    {
        name: 'Ghế đẩy ngực Hammer Strength',
        type: 'Strength',
        brand: 'Hammer Strength',
        model: 'ISO-Lateral Bench Press',
        serialNumber: 'HS-BP-006',
        purchaseDate: '2023-01-25',
        purchasePrice: 68000000,
        warrantyExpiry: '2028-01-25',
        status: 'active',
        location: 'Khu vực Tạ tự do',
        notes: 'Ghế đẩy ngực chuyên nghiệp với hệ thống cân bằng'
    },
    {
        name: 'Máy kéo xà Assisted Pull-up',
        type: 'Strength',
        brand: 'Cybex',
        model: 'VR3 Assisted Pull-up',
        serialNumber: 'CX-VR3-007',
        purchaseDate: '2023-02-15',
        purchasePrice: 42000000,
        warrantyExpiry: '2028-02-15',
        status: 'active',
        location: 'Khu vực Tạ máy',
        notes: 'Máy hỗ trợ kéo xà với tăng giảm trọng lượng'
    },
    {
        name: 'Máy đẩy vai Life Fitness Signature',
        type: 'Strength',
        brand: 'Life Fitness',
        model: 'Signature Shoulder Press',
        serialNumber: 'LF-SIG-008',
        purchaseDate: '2023-02-20',
        purchasePrice: 58000000,
        warrantyExpiry: '2028-02-20',
        status: 'active',
        location: 'Khu vực Tạ máy',
        notes: 'Máy đẩy vai với góc điều chỉnh linh hoạt'
    },
    {
        name: 'Smith Machine Power Rack',
        type: 'Strength',
        brand: 'Hoist Fitness',
        model: 'CF-3753',
        serialNumber: 'HF-SM-009',
        purchaseDate: '2023-01-30',
        purchasePrice: 75000000,
        warrantyExpiry: '2028-01-30',
        status: 'active',
        location: 'Khu vực Tạ tự do',
        notes: 'Smith Machine với thanh an toàn và kệ squat'
    },
    {
        name: 'Máy gập bụng TRX Suspension',
        type: 'Strength',
        brand: 'TRX',
        model: 'Commercial Suspension',
        serialNumber: 'TRX-CS-010',
        purchaseDate: '2023-03-05',
        purchasePrice: 15000000,
        warrantyExpiry: '2026-03-05',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Hệ thống TRX chuyên nghiệp với 4 điểm neo'
    },

    // Free Weights (Tạ tự do)
    {
        name: 'Bộ tạ đơn Rubber Hex 5-50kg',
        type: 'Free Weights',
        brand: 'Rogue Fitness',
        model: 'Rubber Hex Dumbbells',
        serialNumber: 'RF-RHD-011',
        purchaseDate: '2023-01-10',
        purchasePrice: 95000000,
        warrantyExpiry: '2030-01-10',
        status: 'active',
        location: 'Khu vực Tạ tự do',
        notes: 'Bộ tạ đơn bọc cao su từ 5-50kg, 18 đôi'
    },
    {
        name: 'Olympic Barbell 20kg',
        type: 'Free Weights',
        brand: 'Eleiko',
        model: 'Sport Training Bar',
        serialNumber: 'EL-STB-012',
        purchaseDate: '2023-01-12',
        purchasePrice: 28000000,
        warrantyExpiry: '2033-01-12',
        status: 'active',
        location: 'Khu vực Tạ tự do',
        notes: 'Thanh tạ Olympic chuyên nghiệp 2.2m'
    },
    {
        name: 'Bộ đĩa tạ Olympic 200kg',
        type: 'Free Weights',
        brand: 'Rogue Fitness',
        model: 'Hi-Temp Bumper Plates',
        serialNumber: 'RF-HTP-013',
        purchaseDate: '2023-01-15',
        purchasePrice: 65000000,
        warrantyExpiry: '2035-01-15',
        status: 'active',
        location: 'Khu vực Tạ tự do',
        notes: 'Bộ đĩa tạ cao su 10kg-25kg'
    },
    {
        name: 'Kettlebell Set 8-48kg',
        type: 'Free Weights',
        brand: 'Dragon Door',
        model: 'RKC Kettlebells',
        serialNumber: 'DD-RKC-014',
        purchaseDate: '2023-02-01',
        purchasePrice: 38000000,
        warrantyExpiry: '2030-02-01',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Bộ tạ ấm chuyên nghiệp 8-48kg'
    },
    {
        name: 'Medicine Ball Set 2-12kg',
        type: 'Free Weights',
        brand: 'Dynamax',
        model: 'Medicine Balls',
        serialNumber: 'DX-MB-015',
        purchaseDate: '2023-02-10',
        purchasePrice: 18000000,
        warrantyExpiry: '2028-02-10',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Bộ bóng tập 6 quả từ 2-12kg'
    },

    // Functional Training
    {
        name: 'Máy kéo cáp CrossFit Rig',
        type: 'Functional',
        brand: 'Rogue Fitness',
        model: 'R-6 Monster Rack',
        serialNumber: 'RF-R6-016',
        purchaseDate: '2023-02-25',
        purchasePrice: 85000000,
        warrantyExpiry: '2030-02-25',
        status: 'active',
        location: 'Khu vực CrossFit',
        notes: 'Khung CrossFit đa năng với 12 điểm kết nối'
    },
    {
        name: 'Battle Rope 15m x 5cm',
        type: 'Functional',
        brand: 'Rep Fitness',
        model: 'Battle Ropes',
        serialNumber: 'REP-BR-017',
        purchaseDate: '2023-03-01',
        purchasePrice: 8500000,
        warrantyExpiry: '2028-03-01',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Dây tập thể lực 15m đường kính 5cm'
    },
    {
        name: 'Plyo Box Set 20-30-36 inch',
        type: 'Functional',
        brand: 'Yes4All',
        model: 'Foam Plyo Box',
        serialNumber: 'Y4A-PB-018',
        purchaseDate: '2023-03-05',
        purchasePrice: 12000000,
        warrantyExpiry: '2028-03-05',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Bộ 3 hộp nhảy cao khác nhau'
    },
    {
        name: 'Máy kéo cáp Functional Trainer',
        type: 'Functional',
        brand: 'Freemotion',
        model: 'EXT Dual Cable Cross',
        serialNumber: 'FM-EXT-019',
        purchaseDate: '2023-02-28',
        purchasePrice: 88000000,
        warrantyExpiry: '2028-02-28',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Máy kéo cáp đôi với 200 bài tập'
    },
    {
        name: 'Suspension Trainer TRX Pro 4',
        type: 'Functional',
        brand: 'TRX',
        model: 'Pro Suspension Trainer',
        serialNumber: 'TRX-PST-020',
        purchaseDate: '2023-03-10',
        purchasePrice: 6500000,
        warrantyExpiry: '2026-03-10',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'TRX Pro với phụ kiện đầy đủ'
    },

    // Recovery & Stretching
    {
        name: 'Máy massage gun Theragun Pro',
        type: 'Recovery',
        brand: 'Therabody',
        model: 'Theragun Pro',
        serialNumber: 'TB-TGP-021',
        purchaseDate: '2023-03-15',
        purchasePrice: 15000000,
        warrantyExpiry: '2025-03-15',
        status: 'active',
        location: 'Khu vực Recovery',
        notes: 'Súng massage chuyên nghiệp 5 đầu massage'
    },
    {
        name: 'Foam Roller Set High Density',
        type: 'Recovery',
        brand: 'Gaiam',
        model: 'Restore Foam Roller',
        serialNumber: 'GA-RFR-022',
        purchaseDate: '2023-03-20',
        purchasePrice: 5500000,
        warrantyExpiry: '2028-03-20',
        status: 'active',
        location: 'Khu vực Recovery',
        notes: 'Bộ 3 con lăn massage khác độ cứng'
    },
    {
        name: 'Máy kéo giãn cơ Stretch Machine',
        type: 'Recovery',
        brand: 'Precor',
        model: 'Stretch Trainer',
        serialNumber: 'PC-ST-023',
        purchaseDate: '2023-03-25',
        purchasePrice: 45000000,
        warrantyExpiry: '2028-03-25',
        status: 'active',
        location: 'Khu vực Recovery',
        notes: 'Máy hỗ trợ kéo giãn cơ toàn thân'
    },

    // Specialized Equipment
    {
        name: 'Máy đo thành phần cơ thể InBody 970',
        type: 'Assessment',
        brand: 'InBody',
        model: '970',
        serialNumber: 'IB-970-024',
        purchaseDate: '2023-04-01',
        purchasePrice: 85000000,
        warrantyExpiry: '2026-04-01',
        status: 'active',
        location: 'Phòng tư vấn',
        notes: 'Máy đo thành phần cơ thể chuyên nghiệp'
    },
    {
        name: 'Ghế massage toàn thân Osaki OS-4000T',
        type: 'Recovery',
        brand: 'Osaki',
        model: 'OS-4000T',
        serialNumber: 'OS-4000T-025',
        purchaseDate: '2023-04-05',
        purchasePrice: 95000000,
        warrantyExpiry: '2026-04-05',
        status: 'active',
        location: 'Khu vực VIP',
        notes: 'Ghế massage cao cấp với 5 chương trình'
    },
    {
        name: 'Máy tập leo núi Versaclimber',
        type: 'Cardio',
        brand: 'VersaClimber',
        model: 'LX',
        serialNumber: 'VC-LX-026',
        purchaseDate: '2023-04-10',
        purchasePrice: 78000000,
        warrantyExpiry: '2026-04-10',
        status: 'active',
        location: 'Khu vực Cardio B',
        notes: 'Máy tập leo núi toàn thân'
    },
    {
        name: 'Máy tập SkiErg Concept2',
        type: 'Cardio',
        brand: 'Concept2',
        model: 'SkiErg PM5',
        serialNumber: 'C2-SE-027',
        purchaseDate: '2023-04-15',
        purchasePrice: 35000000,
        warrantyExpiry: '2028-04-15',
        status: 'active',
        location: 'Khu vực Cardio B',
        notes: 'Máy mô phỏng trượt tuyết'
    },
    {
        name: 'Máy chèo thuyền Concept2 Model D',
        type: 'Cardio',
        brand: 'Concept2',
        model: 'Model D PM5',
        serialNumber: 'C2-MD-028',
        purchaseDate: '2023-04-20',
        purchasePrice: 42000000,
        warrantyExpiry: '2028-04-20',
        status: 'active',
        location: 'Khu vực Cardio A',
        notes: 'Máy chèo thuyền với màn hình PM5'
    },
    {
        name: 'Máy tập Assault Bike',
        type: 'Cardio',
        brand: 'Assault Fitness',
        model: 'AirBike Classic',
        serialNumber: 'AF-AB-029',
        purchaseDate: '2023-04-25',
        purchasePrice: 48000000,
        warrantyExpiry: '2026-04-25',
        status: 'active',
        location: 'Khu vực CrossFit',
        notes: 'Xe đạp tập cường độ cao với tay lái'
    },
    {
        name: 'Máy cân bằng BOSU Ball Pro',
        type: 'Functional',
        brand: 'BOSU',
        model: 'NexGen Pro Balance Trainer',
        serialNumber: 'BOSU-NG-030',
        purchaseDate: '2023-04-30',
        purchasePrice: 18500000,
        warrantyExpiry: '2028-04-30',
        status: 'active',
        location: 'Khu vực Functional',
        notes: 'Bóng cân bằng chuyên nghiệp 2 mặt'
    }
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
            stats[eq.type] = (stats[eq.type] || 0) + 1;
        });
        
        console.log(`\n📈 Thống kê theo loại thiết bị:`);
        Object.entries(stats).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} thiết bị`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Lỗi khi thêm thiết bị:', error);
        process.exit(1);
    }
}

// Chạy script
addEquipment();