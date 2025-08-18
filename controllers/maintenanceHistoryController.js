const { MaintenanceHistory, Equipment, User, EquipmentMaintenance, MaintenanceSchedule } = require('../models');
const { ValidationError, NotFoundError } = require('../utils/errors');

const maintenanceHistoryController = {
    // Create new maintenance history record
    async create(req, res) {
        try {
            const {
                equipmentId,
                maintenanceId,
                scheduleId,
                maintenanceType,
                performedDate,
                duration,
                workPerformed,
                issuesFound,
                partsReplaced,
                cost,
                equipmentConditionBefore,
                equipmentConditionAfter,
                priority,
                result,
                nextMaintenanceRecommended,
                photos,
                notes,
                qualityRating,
                isWarrantyWork
            } = req.body;

            const performedBy = req.user.userId;

            // Validate equipment exists
            const equipment = await Equipment.findByPk(equipmentId);
            if (!equipment) {
                throw new NotFoundError('Equipment not found');
            }

            const history = await MaintenanceHistory.create({
                equipmentId,
                maintenanceId,
                scheduleId,
                maintenanceType,
                performedDate: performedDate || new Date().toISOString().split('T')[0],
                performedBy,
                duration,
                workPerformed,
                issuesFound,
                partsReplaced,
                cost: cost || 0,
                equipmentConditionBefore,
                equipmentConditionAfter,
                priority: priority || 'medium',
                result: result || 'completed',
                nextMaintenanceRecommended,
                photos,
                notes,
                qualityRating,
                isWarrantyWork: isWarrantyWork || false
            });

            const historyWithDetails = await MaintenanceHistory.findByPk(history.id, {
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['id', 'name', 'equipmentCode', 'category']
                    },
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    }
                ]
            });

            res.status(201).json({
                success: true,
                data: historyWithDetails,
                message: 'Maintenance history record created successfully'
            });
        } catch (error) {
            console.error('Error creating maintenance history:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    },

    // Get all maintenance history records
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                equipmentId,
                performedBy,
                maintenanceType,
                result,
                startDate,
                endDate,
                sortBy = 'performedDate',
                sortOrder = 'DESC'
            } = req.query;

            const whereClause = {};
            if (equipmentId) whereClause.equipmentId = equipmentId;
            if (performedBy) whereClause.performedBy = performedBy;
            if (maintenanceType) whereClause.maintenanceType = maintenanceType;
            if (result) whereClause.result = result;
            
            if (startDate && endDate) {
                whereClause.performedDate = {
                    [require('sequelize').Op.between]: [startDate, endDate]
                };
            }

            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { rows: history, count: total } = await MaintenanceHistory.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['id', 'name', 'equipmentCode', 'category', 'status']
                    },
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    }
                ],
                order: [[sortBy, sortOrder.toUpperCase()]],
                limit: parseInt(limit),
                offset
            });

            res.json({
                success: true,
                data: {
                    history,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching maintenance history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get maintenance statistics
    async getStats(req, res) {
        try {
            const { equipmentId, startDate, endDate } = req.query;
            
            const stats = await MaintenanceHistory.getMaintenanceStats(
                equipmentId,
                startDate,
                endDate
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error fetching maintenance stats:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get cost analysis
    async getCostAnalysis(req, res) {
        try {
            const { period = 'month' } = req.query;
            
            const analysis = await MaintenanceHistory.getCostAnalysis(period);

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error fetching cost analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get equipment reliability analysis
    async getReliability(req, res) {
        try {
            const reliability = await MaintenanceHistory.getEquipmentReliability();

            res.json({
                success: true,
                data: reliability
            });
        } catch (error) {
            console.error('Error fetching reliability analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get maintenance history by equipment
    async getByEquipment(req, res) {
        try {
            const { equipmentId } = req.params;
            const { limit = 50, maintenanceType } = req.query;

            const whereClause = { equipmentId };
            if (maintenanceType) whereClause.maintenanceType = maintenanceType;

            const history = await MaintenanceHistory.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    },
                    {
                        model: EquipmentMaintenance,
                        as: 'maintenance',
                        attributes: ['id', 'title', 'status']
                    }
                ],
                order: [['performedDate', 'DESC']],
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error fetching equipment history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get maintenance history by performer
    async getByPerformer(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 50, startDate, endDate } = req.query;

            const whereClause = { performedBy: userId };
            
            if (startDate && endDate) {
                whereClause.performedDate = {
                    [require('sequelize').Op.between]: [startDate, endDate]
                };
            }

            const history = await MaintenanceHistory.findAll({
                where: whereClause,
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['id', 'name', 'equipmentCode', 'category']
                    }
                ],
                order: [['performedDate', 'DESC']],
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error fetching performer history:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get maintenance history by ID
    async getById(req, res) {
        try {
            const { id } = req.params;

            const history = await MaintenanceHistory.findByPk(id, {
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['id', 'name', 'equipmentCode', 'category', 'status']
                    },
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    },
                    {
                        model: EquipmentMaintenance,
                        as: 'maintenance',
                        attributes: ['id', 'title', 'status', 'description']
                    },
                    {
                        model: MaintenanceSchedule,
                        as: 'schedule',
                        attributes: ['id', 'maintenanceType', 'intervalDays']
                    }
                ]
            });

            if (!history) {
                throw new NotFoundError('Maintenance history record not found');
            }

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error fetching maintenance history:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    },

    // Update maintenance history
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const history = await MaintenanceHistory.findByPk(id);
            if (!history) {
                throw new NotFoundError('Maintenance history record not found');
            }

            await history.update(updateData);

            const updatedHistory = await MaintenanceHistory.findByPk(id, {
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['id', 'name', 'equipmentCode', 'category']
                    },
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    }
                ]
            });

            res.json({
                success: true,
                data: updatedHistory,
                message: 'Maintenance history updated successfully'
            });
        } catch (error) {
            console.error('Error updating maintenance history:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    },

    // Delete maintenance history
    async delete(req, res) {
        try {
            const { id } = req.params;

            const history = await MaintenanceHistory.findByPk(id);
            if (!history) {
                throw new NotFoundError('Maintenance history record not found');
            }

            await history.destroy();

            res.json({
                success: true,
                message: 'Maintenance history deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting maintenance history:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    },

    // Get efficiency analysis
    async getEfficiencyAnalysis(req, res) {
        try {
            const { startDate, endDate, performedBy } = req.query;

            const whereClause = {};
            if (startDate && endDate) {
                whereClause.performedDate = {
                    [require('sequelize').Op.between]: [startDate, endDate]
                };
            }
            if (performedBy) whereClause.performedBy = performedBy;

            const records = await MaintenanceHistory.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['id', 'username', 'fullName']
                    }
                ]
            });

            const analysis = records.map(record => ({
                id: record.id,
                equipmentId: record.equipmentId,
                performer: record.performer,
                efficiency: record.calculateEfficiency(),
                costEffectiveness: record.getCostEffectiveness(),
                wasOnTime: record.wasOnTime(),
                performedDate: record.performedDate,
                duration: record.duration,
                cost: record.cost
            }));

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error fetching efficiency analysis:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get cost trends
    async getCostTrends(req, res) {
        try {
            const { period = 'month', months = 12 } = req.query;
            
            const analysis = await MaintenanceHistory.getCostAnalysis(period);
            
            // Limit to specified number of periods
            const limitedAnalysis = analysis.slice(0, parseInt(months));

            res.json({
                success: true,
                data: limitedAnalysis
            });
        } catch (error) {
            console.error('Error fetching cost trends:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Get equipment performance analysis
    async getEquipmentPerformance(req, res) {
        try {
            const reliability = await MaintenanceHistory.getEquipmentReliability();

            // Add performance scores
            const performanceData = reliability.map(item => {
                const maintenanceCount = parseInt(item.maintenanceCount) || 0;
                const repairCount = parseInt(item.repairCount) || 0;
                const avgQuality = parseFloat(item.avgQuality) || 0;
                
                // Calculate performance score (0-100)
                let performanceScore = 100;
                
                // Deduct points for frequent repairs
                if (maintenanceCount > 0) {
                    const repairRatio = repairCount / maintenanceCount;
                    performanceScore -= repairRatio * 50;
                }
                
                // Adjust for quality rating
                if (avgQuality > 0) {
                    performanceScore = performanceScore * (avgQuality / 5);
                }
                
                return {
                    ...item,
                    performanceScore: Math.max(0, Math.round(performanceScore)),
                    repairRatio: maintenanceCount > 0 ? (repairCount / maintenanceCount * 100).toFixed(2) : 0
                };
            });

            res.json({
                success: true,
                data: performanceData
            });
        } catch (error) {
            console.error('Error fetching equipment performance:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Export to CSV
    async exportCSV(req, res) {
        try {
            const { startDate, endDate, equipmentId } = req.query;

            const whereClause = {};
            if (startDate && endDate) {
                whereClause.performedDate = {
                    [require('sequelize').Op.between]: [startDate, endDate]
                };
            }
            if (equipmentId) whereClause.equipmentId = equipmentId;

            const records = await MaintenanceHistory.findAll({
                where: whereClause,
                include: [
                    {
                        model: Equipment,
                        as: 'equipment',
                        attributes: ['name', 'equipmentCode', 'category']
                    },
                    {
                        model: User,
                        as: 'performer',
                        attributes: ['username', 'fullName']
                    }
                ],
                order: [['performedDate', 'DESC']]
            });

            // Create CSV headers
            const headers = [
                'Date',
                'Equipment Code',
                'Equipment Name',
                'Category',
                'Maintenance Type',
                'Performed By',
                'Duration (min)',
                'Cost (VND)',
                'Result',
                'Quality Rating',
                'Notes'
            ];

            // Create CSV rows
            const rows = records.map(record => [
                record.performedDate,
                record.equipment?.equipmentCode || '',
                record.equipment?.name || '',
                record.equipment?.category || '',
                record.maintenanceType,
                record.performer?.fullName || record.performer?.username || '',
                record.duration || '',
                record.cost || 0,
                record.result,
                record.qualityRating || '',
                (record.notes || '').replace(/"/g, '""') // Escape quotes for CSV
            ]);

            // Generate CSV content
            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="maintenance_history.csv"');
            res.send(csvContent);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    },

    // Export to PDF (placeholder - would need PDF library)
    async exportPDF(req, res) {
        try {
            // This would require a PDF generation library like puppeteer or pdfkit
            res.status(501).json({
                success: false,
                message: 'PDF export not implemented yet'
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
};

module.exports = maintenanceHistoryController;