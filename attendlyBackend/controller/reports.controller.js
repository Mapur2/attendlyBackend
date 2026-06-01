const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Attendance, User, Subject } = require('../db/connectDb');
const { Op } = require('sequelize');

const formatDate = (date) => new Date(date).toISOString().split('T')[0];

const getAttendanceCsv = asyncHandler(async (req, res) => {
    const { sessionId, subjectId, startDate, endDate } = req.query;
    const institutionId = req.user.institutionId;

    const where = { institutionId };
    if (sessionId) where.sessionId = sessionId;
    if (subjectId) where.subjectId = subjectId;
    
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const records = await Attendance.findAll({
        where,
        include: [
            { model: User, attributes: ['id', 'name', 'email', 'collegeCode'] },
            { model: Subject, attributes: ['name', 'code'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    const headers = ['Student ID', 'College Code', 'Name', 'Email', 'Subject', 'Session ID', 'Timestamp', 'IP', 'Latitude', 'Longitude'];
    const rows = records.map(r => {
        return [
            r.User?.id || '',
            r.User?.collegeCode || '',
            `"${(r.User?.name || '').replace(/"/g, '""')}"`,
            r.User?.email || '',
            `"${(r.Subject?.name || '').replace(/"/g, '""')}"`,
            r.sessionId || '',
            r.createdAt.toISOString(),
            r.ip || '',
            r.latitude || '',
            r.longitude || ''
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    return res.status(200).send(csvContent);
});

const getAttendanceStats = asyncHandler(async (req, res) => {
    const { subjectId, startDate, endDate } = req.query;
    const institutionId = req.user.institutionId;

    const where = { institutionId };
    if (subjectId) where.subjectId = subjectId;

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const records = await Attendance.findAll({
        where,
        attributes: ['userId', 'createdAt'],
        order: [['createdAt', 'ASC']]
    });

    const dailyStats = {};
    records.forEach(r => {
        const date = formatDate(r.createdAt);
        if (!dailyStats[date]) {
            dailyStats[date] = new Set();
        }
        dailyStats[date].add(r.userId);
    });

    const chartData = Object.keys(dailyStats).map(date => ({
        date,
        attendeesCount: dailyStats[date].size
    }));

    return res.status(200).json(new ApiResponse(200, { chartData }, 'Attendance stats retrieved successfully'));
});

const getStudentAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const institutionId = req.user.institutionId;

    const student = await User.findOne({ where: { id, institutionId } });
    if (!student) {
        throw new ApiError(404, 'Student not found');
    }

    const records = await Attendance.findAll({
        where: { userId: id, institutionId },
        include: [{ model: Subject, attributes: ['name', 'code'] }],
        order: [['createdAt', 'DESC']]
    });

    // Group by month
    const monthlyData = {};
    const uniqueDates = new Set();

    records.forEach(r => {
        const date = formatDate(r.createdAt);
        const month = date.substring(0, 7); // YYYY-MM
        
        if (!monthlyData[month]) {
            monthlyData[month] = {
                month,
                totalAttendance: 0,
                uniqueDates: new Set(),
                subjects: new Set()
            };
        }
        
        monthlyData[month].totalAttendance++;
        monthlyData[month].uniqueDates.add(date);
        monthlyData[month].subjects.add(r.subjectId);
        uniqueDates.add(date);
    });

    const groupedByMonth = Object.keys(monthlyData).map(month => ({
        month,
        totalAttendance: monthlyData[month].totalAttendance,
        daysPresent: monthlyData[month].uniqueDates.size,
        subjectsCount: monthlyData[month].subjects.size
    })).sort((a, b) => b.month.localeCompare(a.month));

    // Calculate overall metrics
    const totalRecords = records.length;
    const totalDaysPresent = uniqueDates.size;
    const uniqueSubjects = new Set(records.map(r => r.subjectId)).size;

    // Get date range
    const firstAttendance = records.length > 0 ? formatDate(records[records.length - 1].createdAt) : null;
    const lastAttendance = records.length > 0 ? formatDate(records[0].createdAt) : null;

    const metrics = {
        totalRecords,
        totalDaysPresent,
        uniqueSubjects,
        dateRange: {
            from: firstAttendance,
            to: lastAttendance
        },
        averagePerDay: totalDaysPresent > 0 ? (totalRecords / totalDaysPresent).toFixed(2) : 0
    };

    return res.status(200).json(new ApiResponse(200, {
        records,
        groupedByMonth,
        metrics
    }, 'Student attendance retrieved successfully'));
});

module.exports = {
    getAttendanceCsv,
    getAttendanceStats,
    getStudentAttendance
};
