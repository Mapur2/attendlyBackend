const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Attendance, User, Subject, Department, Year } = require('../db/connectDb');
const { Op, fn, col, literal } = require('sequelize');

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

/**
 * GET /reports/dept-year-daily
 * ?startDate=YYYY-MM-DD  (optional, defaults to 30 days ago)
 * ?endDate=YYYY-MM-DD    (optional, defaults to today)
 * ?departmentId=uuid      (optional, filter to one department)
 *
 * Returns a tree:
 * [
 *   {
 *     department: { id, name, code },
 *     years: [
 *       {
 *         year: { id, name },
 *         totalStudents: N,
 *         days: [
 *           { date, present, absent, total, attendanceRate },
 *           ...
 *         ]
 *       }
 *     ]
 *   }
 * ]
 */
const getDeptYearDailyAttendance = asyncHandler(async (req, res) => {
    const { institutionId } = req.user;
    const { startDate, endDate, departmentId } = req.query;

    // Default: last 30 days
    const from = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to   = endDate   ? new Date(endDate)   : new Date();
    // Include the full end day
    to.setHours(23, 59, 59, 999);

    // ── 1. Fetch departments ──────────────────────────────────
    const deptWhere = { institutionId };
    if (departmentId) deptWhere.id = departmentId;

    const departments = await Department.findAll({
        where: deptWhere,
        attributes: ['id', 'name', 'departmentCode'],
        include: [{
            model: Year,
            as: 'years',
            attributes: ['id', 'name'],
        }],
        order: [['name', 'ASC'], [{ model: Year, as: 'years' }, 'name', 'ASC']],
    });

    if (!departments.length) {
        return res.json(new ApiResponse(200, { report: [] }, 'No departments found'));
    }

    // ── 2. Collect all yearIds across all departments ─────────
    const allYearIds = departments.flatMap(d => d.years.map(y => y.id));
    if (!allYearIds.length) {
        return res.json(new ApiResponse(200, { report: [] }, 'No years configured yet'));
    }

    // ── 3. Fetch students grouped by yearId ───────────────────
    // Returns: [ { id, yearId, departmentId } ]
    const students = await User.findAll({
        where: { institutionId, role: 'student', yearId: { [Op.in]: allYearIds } },
        attributes: ['id', 'yearId', 'departmentId'],
    });

    // yearId → Set of studentIds
    const studentsByYear = {};
    for (const s of students) {
        if (!studentsByYear[s.yearId]) studentsByYear[s.yearId] = new Set();
        studentsByYear[s.yearId].add(s.id);
    }

    const allStudentIds = students.map(s => s.id);

    // ── 4. Fetch attendance records in the date range ─────────
    const attendanceRows = allStudentIds.length
        ? await Attendance.findAll({
            where: {
                institutionId,
                userId: { [Op.in]: allStudentIds },
                createdAt: { [Op.between]: [from, to] },
            },
            attributes: ['userId', 'createdAt'],
          })
        : [];

    // ── 5. Build a map: yearId → date → Set(userId) ───────────
    // First, build userId → yearId lookup
    const userYearMap = {};
    for (const s of students) userYearMap[s.id] = s.yearId;

    // yearId → date → Set<userId>
    const presenceMap = {};
    for (const row of attendanceRows) {
        const yearId = userYearMap[row.userId];
        if (!yearId) continue;
        const date = formatDate(row.createdAt);
        if (!presenceMap[yearId]) presenceMap[yearId] = {};
        if (!presenceMap[yearId][date]) presenceMap[yearId][date] = new Set();
        presenceMap[yearId][date].add(row.userId);
    }

    // ── 6. Collect all distinct dates in range from data ──────
    const allDates = [...new Set(attendanceRows.map(r => formatDate(r.createdAt)))].sort();

    // ── 7. Build the response tree ────────────────────────────
    const report = departments.map(dept => ({
        department: {
            id:   dept.id,
            name: dept.name,
            code: dept.departmentCode,
        },
        years: dept.years.map(year => {
            const yearStudents = studentsByYear[year.id] || new Set();
            const total = yearStudents.size;
            const yearDates = presenceMap[year.id] || {};

            const days = allDates.map(date => {
                const presentSet = yearDates[date] || new Set();
                const present = presentSet.size;
                const absent  = total - present;
                return {
                    date,
                    present,
                    absent:  Math.max(absent, 0),
                    total,
                    attendanceRate: total > 0 ? +((present / total) * 100).toFixed(1) : 0,
                };
            });

            // Overall summary for this year
            const avgRate = days.length
                ? +(days.reduce((sum, d) => sum + d.attendanceRate, 0) / days.length).toFixed(1)
                : 0;

            return {
                year:          { id: year.id, name: year.name },
                totalStudents: total,
                averageAttendanceRate: avgRate,
                days,
            };
        }),
    }));

    return res.json(new ApiResponse(200, {
        report,
        meta: {
            from: formatDate(from),
            to:   formatDate(to),
            totalDays: allDates.length,
            dates: allDates,
        },
    }, 'Department-year daily attendance report'));
});

module.exports = {
    getAttendanceCsv,
    getAttendanceStats,
    getStudentAttendance,
    getDeptYearDailyAttendance,
};
