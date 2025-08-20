const maintenanceSchedulerService = require('../../../services/maintenanceSchedulerService');
const { Equipment, MaintenanceSchedule, MaintenanceHistory } = require('../../../models');

// Mock the models
jest.mock('../../../models');

describe('MaintenanceSchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchedulesForEquipment', () => {
    test('should create maintenance schedules for high priority equipment', async () => {
      const mockEquipment = {
        id: 1,
        name: 'Treadmill Pro',
        priority: 'high'
      };

      Equipment.findByPk = jest.fn().mockResolvedValue(mockEquipment);
      MaintenanceSchedule.create = jest.fn().mockImplementation((data) => ({
        id: Math.random(),
        ...data
      }));

      const result = await maintenanceSchedulerService.createSchedulesForEquipment(1, 'high');

      expect(result).toHaveLength(3); // high priority = 3 schedules (cleaning, inspection, maintenance)
      expect(MaintenanceSchedule.create).toHaveBeenCalledTimes(3);
      
      // Check cleaning schedule (daily for high priority)
      expect(MaintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 1,
          maintenanceType: 'cleaning',
          intervalDays: 1,
          priority: 'high'
        })
      );

      // Check inspection schedule (weekly for high priority)
      expect(MaintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 1,
          maintenanceType: 'inspection',
          intervalDays: 7,
          priority: 'high'
        })
      );

      // Check maintenance schedule (monthly for high priority)
      expect(MaintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 1,
          maintenanceType: 'maintenance',
          intervalDays: 30,
          priority: 'high'
        })
      );
    });

    test('should create maintenance schedules for low priority equipment', async () => {
      const mockEquipment = {
        id: 2,
        name: 'Basic Weight',
        priority: 'low'
      };

      Equipment.findByPk = jest.fn().mockResolvedValue(mockEquipment);
      MaintenanceSchedule.create = jest.fn().mockImplementation((data) => ({
        id: Math.random(),
        ...data
      }));

      const result = await maintenanceSchedulerService.createSchedulesForEquipment(2, 'low');

      expect(result).toHaveLength(3);
      expect(MaintenanceSchedule.create).toHaveBeenCalledTimes(3);
      
      // Check cleaning schedule (weekly for low priority)
      expect(MaintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 2,
          maintenanceType: 'cleaning',
          intervalDays: 7,
          priority: 'low'
        })
      );

      // Check maintenance schedule (quarterly for low priority)
      expect(MaintenanceSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 2,
          maintenanceType: 'maintenance',
          intervalDays: 90,
          priority: 'low'
        })
      );
    });

    test('should handle equipment not found', async () => {
      Equipment.findByPk = jest.fn().mockResolvedValue(null);

      const result = await maintenanceSchedulerService.createSchedulesForEquipment(999, 'high');

      expect(result).toEqual([]);
      expect(MaintenanceSchedule.create).not.toHaveBeenCalled();
    });
  });

  describe('completeMaintenance', () => {
    test('should complete maintenance and create next schedule', async () => {
      const mockSchedule = {
        id: 1,
        equipmentId: 1,
        maintenanceType: 'cleaning',
        intervalDays: 7,
        isActive: true,
        equipment: {
          name: 'Test Equipment',
          priority: 'high'
        }
      };

      const mockUpdatedSchedules = [1]; // Mock update result
      const mockNewSchedule = {
        id: 2,
        equipmentId: 1,
        maintenanceType: 'cleaning',
        isActive: true
      };

      MaintenanceSchedule.findByPk = jest.fn().mockResolvedValue(mockSchedule);
      MaintenanceSchedule.update = jest.fn().mockResolvedValue(mockUpdatedSchedules);
      MaintenanceSchedule.findOne = jest.fn().mockResolvedValue(null); // No existing schedule for next date
      MaintenanceSchedule.create = jest.fn().mockResolvedValue(mockNewSchedule);
      MaintenanceHistory.create = jest.fn().mockResolvedValue({
        id: 1,
        equipmentId: 1,
        maintenanceType: 'cleaning'
      });

      const result = await maintenanceSchedulerService.completeMaintenance(1, {
        notes: 'Maintenance completed',
        performedBy: 1
      });

      expect(result.success).toBe(true);
      expect(result.nextSchedule).toEqual(mockNewSchedule);
      expect(MaintenanceSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          lastCompletedDate: expect.any(String)
        }),
        expect.objectContaining({
          where: {
            equipmentId: 1,
            maintenanceType: 'cleaning',
            isActive: true
          }
        })
      );
      expect(MaintenanceHistory.create).toHaveBeenCalledTimes(1);
    });

    test('should handle already completed maintenance', async () => {
      const mockSchedule = {
        id: 1,
        equipmentId: 1,
        maintenanceType: 'cleaning',
        isActive: false // Already completed
      };

      MaintenanceSchedule.findByPk = jest.fn().mockResolvedValue(mockSchedule);

      const result = await maintenanceSchedulerService.completeMaintenance(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been completed');
      expect(MaintenanceSchedule.update).not.toHaveBeenCalled();
    });

    test('should handle non-existent schedule', async () => {
      MaintenanceSchedule.findByPk = jest.fn().mockResolvedValue(null);

      const result = await maintenanceSchedulerService.completeMaintenance(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getMaintenanceDashboard', () => {
    test('should return maintenance dashboard data', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Mock maintenance schedule counts
      MaintenanceSchedule.count = jest.fn()
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5)  // overdue
        .mockResolvedValueOnce(3)  // due today
        .mockResolvedValueOnce(42); // upcoming

      // Mock equipment priority counts
      Equipment.findAll = jest.fn().mockResolvedValue([
        { priority: 'critical', count: '2' },
        { priority: 'high', count: '8' },
        { priority: 'medium', count: '15' },
        { priority: 'low', count: '5' }
      ]);

      const result = await maintenanceSchedulerService.getMaintenanceDashboard();

      expect(result.summary.total).toBe(50);
      expect(result.summary.overdue).toBe(5);
      expect(result.summary.dueToday).toBe(3);
      expect(result.summary.upcoming).toBe(42);

      expect(result.equipmentByPriority.critical).toBe(2);
      expect(result.equipmentByPriority.high).toBe(8);
      expect(result.equipmentByPriority.medium).toBe(15);
      expect(result.equipmentByPriority.low).toBe(5);
    });

    test('should handle database errors gracefully', async () => {
      MaintenanceSchedule.count = jest.fn().mockRejectedValue(new Error('Database error'));
      Equipment.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await maintenanceSchedulerService.getMaintenanceDashboard();

      expect(result.summary.total).toBe(0);
      expect(result.summary.overdue).toBe(0);
      expect(result.equipmentByPriority.critical).toBe(0);
    });
  });

  describe('cleanupDuplicateSchedules', () => {
    test('should cleanup duplicate schedules', async () => {
      const mockDuplicates = [
        { id: 1, equipmentId: 1, maintenanceType: 'cleaning', createdAt: '2024-01-01' },
        { id: 2, equipmentId: 1, maintenanceType: 'cleaning', createdAt: '2024-01-02' }, // Duplicate
        { id: 3, equipmentId: 2, maintenanceType: 'inspection', createdAt: '2024-01-01' }
      ];

      MaintenanceSchedule.findAll = jest.fn().mockResolvedValue(mockDuplicates);
      MaintenanceSchedule.update = jest.fn().mockResolvedValue([1]); // 1 row updated

      const result = await maintenanceSchedulerService.cleanupDuplicateSchedules();

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(1); // Should deactivate 1 duplicate
      expect(MaintenanceSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false
        }),
        expect.objectContaining({
          where: {
            id: { [require('sequelize').Op.in]: [2] } // Should deactivate the older duplicate
          }
        })
      );
    });

    test('should handle no duplicates found', async () => {
      const mockSchedules = [
        { id: 1, equipmentId: 1, maintenanceType: 'cleaning' },
        { id: 2, equipmentId: 2, maintenanceType: 'cleaning' } // Different equipment, no duplicate
      ];

      MaintenanceSchedule.findAll = jest.fn().mockResolvedValue(mockSchedules);

      const result = await maintenanceSchedulerService.cleanupDuplicateSchedules();

      expect(result.success).toBe(true);
      expect(result.cleanedCount).toBe(0);
      expect(MaintenanceSchedule.update).not.toHaveBeenCalled();
    });
  });
});