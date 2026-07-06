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
    const id  = req.params?.id || req.user.id
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
    const deptIdSet = new Set(departments.map(d => d.id));
    const students = await User.findAll({
        where: { 
            institutionId, 
            role: 'student', 
            yearId: { [Op.in]: allYearIds },
        },
        attributes: ['id', 'yearId', 'departmentId'],
    });

    // departmentId → yearId → Set of studentIds
    // Only include students whose departmentId is in scope
    const studentsByDeptYear = {};
    for (const s of students) {
        if (!deptIdSet.has(s.departmentId)) continue;
        if (!studentsByDeptYear[s.departmentId]) studentsByDeptYear[s.departmentId] = {};
        if (!studentsByDeptYear[s.departmentId][s.yearId]) studentsByDeptYear[s.departmentId][s.yearId] = new Set();
        studentsByDeptYear[s.departmentId][s.yearId].add(s.id);
    }

    const allStudentIds = students.map(s => s.id);

    // Build dynamic date range constraints
    const attendanceWhere = {
        institutionId,
        userId: { [Op.in]: allStudentIds },
    };

    if (startDate || endDate) {
        attendanceWhere.createdAt = {};
        if (startDate) {
            attendanceWhere.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999);
            attendanceWhere.createdAt[Op.lte] = to;
        }
    }

    // ── 4. Fetch attendance records ─────────
    const attendanceRows = allStudentIds.length
        ? await Attendance.findAll({
            where: attendanceWhere,
            attributes: ['userId', 'createdAt'],
          })
        : [];

    // ── 5. Build a map: yearId → date → Set(userId) ───────────
    // First, build userId → {deptId, yearId} lookup
    const userDeptYearMap = {};
    for (const s of students) {
        userDeptYearMap[s.id] = { deptId: s.departmentId, yearId: s.yearId };
    }

    // deptId → yearId → date → Set<userId>
    const presenceMap = {};
    for (const row of attendanceRows) {
        const studentInfo = userDeptYearMap[row.userId];
        if (!studentInfo) continue;
        const { deptId, yearId } = studentInfo;
        const date = formatDate(row.createdAt);

        if (!presenceMap[deptId]) presenceMap[deptId] = {};
        if (!presenceMap[deptId][yearId]) presenceMap[deptId][yearId] = {};
        if (!presenceMap[deptId][yearId][date]) presenceMap[deptId][yearId][date] = new Set();
        presenceMap[deptId][yearId][date].add(row.userId);
    }

    // ── 6. Collect all distinct dates in range from data ──────
    let allDates = [...new Set(attendanceRows.map(r => formatDate(r.createdAt)))].sort();

    const queryStart = startDate ? new Date(startDate) : null;
    const queryEnd = endDate ? new Date(endDate) : null;

    if (queryStart || queryEnd) {
        const start = queryStart || (allDates.length ? new Date(allDates[0]) : null);
        const end = queryEnd || (allDates.length ? new Date(allDates[allDates.length - 1]) : null);
        
        if (start && end) {
            const generatedDates = [];
            const current = new Date(start);
            while (current <= end) {
                generatedDates.push(current.toISOString().split('T')[0]);
                current.setUTCDate(current.getUTCDate() + 1);
            }
            allDates = [...new Set([...allDates, ...generatedDates])].sort();
        }
    }

    // ── 7. Build the response tree ────────────────────────────

    // If no date range provided, send all data (from/to will reflect data bounds)
    const from = startDate ? new Date(startDate) : (allDates.length ? new Date(allDates[0]) : null);
    const to   = endDate   ? new Date(endDate)   : (allDates.length ? new Date(allDates[allDates.length - 1]) : null);

    const report = departments.map(dept => ({
        department: {
            id:   dept.id,
            name: dept.name,
            code: dept.departmentCode,
        },
        years: dept.years.map(year => {
            const deptStudents = studentsByDeptYear[dept.id] || {};
            const yearStudents = deptStudents[year.id] || new Set();
            const total = yearStudents.size;
            
            const deptPresence = presenceMap[dept.id] || {};
            const yearDates = deptPresence[year.id] || {};

            const days = allDates.map(date => {
                const hasSession = yearDates.hasOwnProperty(date);
                const presentSet = yearDates[date] || new Set();
                const present = presentSet.size;
                const absent  = hasSession ? total - present : 0;
                const dayTotal = hasSession ? total : 0;
                return {
                    date,
                    present,
                    absent:  Math.max(absent, 0),
                    total: dayTotal,
                    attendanceRate: dayTotal > 0 ? +((present / dayTotal) * 100).toFixed(1) : 0,
                    isSession: hasSession,
                };
            });

            // Overall summary for this year
            const sessionDays = days.filter(d => d.isSession);
            const avgRate = sessionDays.length
                ? +(sessionDays.reduce((sum, d) => sum + d.attendanceRate, 0) / sessionDays.length).toFixed(1)
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
            from: from ? formatDate(from) : null,
            to:   to   ? formatDate(to)   : null,
            totalDays: allDates.length,
            dates: allDates,
        },
    }, 'Department-year daily attendance report'));
});

/**
 * GET /reports/subject-day-attendees
 * ?subjectId=UUID  (required)
 * ?date=YYYY-MM-DD (required)
 *
 * Returns every unique student who marked attendance for a subject on a given date.
 * De-duplicates by userId (keeps the earliest check-in time).
 */
const getSubjectDayAttendees = asyncHandler(async (req, res) => {
    const { subjectId, date } = req.query;
    const { institutionId } = req.user;

    if (!subjectId) throw new ApiError(400, 'subjectId is required.');
    if (!date)      throw new ApiError(400, 'date is required (YYYY-MM-DD).');

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) throw new ApiError(400, `Invalid date "${date}". Use YYYY-MM-DD.`);

    // Build start / end of the day in UTC
    const from = new Date(date); from.setUTCHours(0, 0, 0, 0);
    const to   = new Date(date); to.setUTCHours(23, 59, 59, 999);

    // Verify subject exists
    const subject = await Subject.findOne({ where: { id: subjectId } });
    if (!subject) throw new ApiError(404, `Subject ${subjectId} not found.`);

    // Fetch all attendance rows for this subject + date
    const rows = await Attendance.findAll({
        where: {
            institutionId,
            subjectId,
            createdAt: { [Op.between]: [from, to] },
        },
        attributes: ['id', 'userId', 'sessionId', 'ip', 'latitude', 'longitude', 'createdAt'],
        include: [{
            model: User,
            attributes: ['id', 'name', 'email', 'phone', 'collegeCode', 'yearId', 'departmentId', 'isOnboarded'],
        }],
        order: [['createdAt', 'ASC']],
    });

    // De-duplicate by userId — keep the earliest (first) check-in
    const seen    = new Map();
    const unique  = [];
    for (const row of rows) {
        if (!seen.has(row.userId)) {
            seen.set(row.userId, true);
            unique.push(row);
        }
    }

    const attendees = unique.map((row, index) => ({
        rank:       index + 1,
        attendanceId: row.id,
        sessionId:  row.sessionId,
        checkedInAt: row.createdAt,
        ip:         row.ip,
        latitude:   row.latitude,
        longitude:  row.longitude,
        student: {
            id:           row.User?.id,
            name:         row.User?.name,
            email:        row.User?.email,
            phone:        row.User?.phone,
            collegeCode:  row.User?.collegeCode,
            isOnboarded:  row.User?.isOnboarded,
            yearId:       row.User?.yearId,
            departmentId: row.User?.departmentId,
        },
    }));

    return res.json(new ApiResponse(200, {
        subject: { id: subject.id, name: subject.name, code: subject.code },
        date,
        totalPresent: attendees.length,
        attendees,
    }, `Attendees for ${subject.name} on ${date}`));
});

/**
 * GET /reports/dept-year-subject-daily
 * ?startDate=YYYY-MM-DD  (optional, defaults to 30 days ago)
 * ?endDate=YYYY-MM-DD    (optional, defaults to today)
 * ?departmentId=uuid      (optional, filter to one department)
 *
 * Returns a tree:
 * Department -> Year -> Subject -> Day-wise attendance
 */
const getDeptYearSubjectDailyAttendance = asyncHandler(async (req, res) => {
    const { institutionId } = req.user;
    const { startDate, endDate, departmentId } = req.query;

    // 1. Fetch departments with years and subjects
    const deptWhere = { institutionId };
    if (departmentId) deptWhere.id = departmentId;

    const departments = await Department.findAll({
        where: deptWhere,
        attributes: ['id', 'name', 'departmentCode'],
        include: [{
            model: Year,
            as: 'years',
            attributes: ['id', 'name'],
            include: [{
                model: Subject,
                attributes: ['id', 'name', 'code']
            }]
        }],
        order: [
            ['name', 'ASC'],
            [{ model: Year, as: 'years' }, 'name', 'ASC'],
            [{ model: Year, as: 'years' }, Subject, 'name', 'ASC']
        ],
    });

    if (!departments.length) {
        return res.json(new ApiResponse(200, { report: [] }, 'No departments found'));
    }

    // 2. Get list of all yearIds and all subjectIds in scope
    const allYearIds = [];
    const allSubjectIds = [];
    for (const dept of departments) {
        for (const year of dept.years) {
            allYearIds.push(year.id);
            const subjectsList = year.Subjects || year.subjects || [];
            for (const sub of subjectsList) {
                allSubjectIds.push(sub.id);
            }
        }
    }

    // 3. Fetch attendance records directly (subjects already scoped to this institution's depts)
    //    We do NOT filter by studentIds since students may have null departmentId/yearId
    const attendanceWhere = {
        institutionId,
        subjectId: { [Op.in]: allSubjectIds },
    };

    if (startDate || endDate) {
        attendanceWhere.createdAt = {};
        if (startDate) {
            attendanceWhere.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999);
            attendanceWhere.createdAt[Op.lte] = to;
        }
    }

    const attendanceRows = allSubjectIds.length
        ? await Attendance.findAll({
            where: attendanceWhere,
            attributes: ['userId', 'subjectId', 'createdAt'],
          })
        : [];

    // Collect unique userIds from attendance records
    const attendeeUserIds = [...new Set(attendanceRows.map(r => r.userId))];

    // Fetch user details for attendees — only students (exclude teachers/admins who may have joined)
    const attendeeUsers = attendeeUserIds.length
        ? await User.findAll({
            where: { id: { [Op.in]: attendeeUserIds }, institutionId, role: 'student' },
            attributes: ['id', 'name', 'email', 'phone', 'collegeCode', 'yearId', 'departmentId'],
          })
        : [];

    // Build: subjectId -> { deptId, yearId } from the dept/year tree
    const subjectToDeptYear = {};
    for (const dept of departments) {
        for (const year of dept.years) {
            const subjectsList = year.Subjects || year.subjects || [];
            for (const sub of subjectsList) {
                subjectToDeptYear[sub.id] = { deptId: dept.id, yearId: year.id };
            }
        }
    }

    // Build studentMap from attendee users — clean response shape (no internal fields)
    const studentMap = {};
    for (const u of attendeeUsers) {
        studentMap[u.id] = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            collegeCode: u.collegeCode,
            // departmentId & yearId intentionally omitted from response
        };
    }

    // 4. Now fetch ALL students in this institution to compute totalStudents per dept/year
    //    We query students broadly since departmentId/yearId may be null on students
    const allStudentsRaw = await User.findAll({
        where: { institutionId, role: 'student' },
        attributes: ['id', 'departmentId', 'yearId'],
    });

    // Build deptId -> yearId -> Set<userId> for totalStudents count
    // For a student, try to match them to a dept+year in scope
    const deptIdSet = new Set(departments.map(d => d.id));
    const yearToDeptId = {};
    for (const dept of departments) {
        for (const year of dept.years) {
            yearToDeptId[year.id] = dept.id;
        }
    }

    const studentsByDeptYear = {};

    // Count of all institution students as a fallback denominator when dept/year are unassigned
    const totalInstitutionStudents = allStudentsRaw.length;

    for (const s of allStudentsRaw) {
        const deptId = deptIdSet.has(s.departmentId)
            ? s.departmentId
            : (s.yearId ? yearToDeptId[s.yearId] : null);

        const yearId = s.yearId
            || (deptId ? departments.find(d => d.id === deptId)?.years[0]?.id : null);

        if (!deptId || !yearId) continue;

        if (!studentsByDeptYear[deptId]) studentsByDeptYear[deptId] = {};
        if (!studentsByDeptYear[deptId][yearId]) studentsByDeptYear[deptId][yearId] = new Set();
        studentsByDeptYear[deptId][yearId].add(s.id);
    }


    // Map: deptId -> yearId -> subjectId -> date -> Map(userId -> StudentDetails)
    // Use subjectToDeptYear to place each attendance record in the correct dept/year bucket
    const presenceMap = {};
    for (const row of attendanceRows) {
        const location = subjectToDeptYear[row.subjectId];
        if (!location) continue; // subject not in scope

        const { deptId, yearId } = location;
        const subId = row.subjectId;
        const date = formatDate(row.createdAt);
        const userDetails = studentMap[row.userId];

        // Skip if user is not a student (teacher/admin who joined the session)
        if (!userDetails) continue;

        if (!presenceMap[deptId]) presenceMap[deptId] = {};
        if (!presenceMap[deptId][yearId]) presenceMap[deptId][yearId] = {};
        if (!presenceMap[deptId][yearId][subId]) presenceMap[deptId][yearId][subId] = {};
        if (!presenceMap[deptId][yearId][subId][date]) presenceMap[deptId][yearId][subId][date] = new Map();
        
        if (!presenceMap[deptId][yearId][subId][date].has(row.userId)) {
            presenceMap[deptId][yearId][subId][date].set(row.userId, userDetails);
        }
    }



    // Get all unique dates in the data range
    let allDates = [...new Set(attendanceRows.map(r => formatDate(r.createdAt)))].sort();

    const queryStart = startDate ? new Date(startDate) : null;
    const queryEnd = endDate ? new Date(endDate) : null;

    if (queryStart || queryEnd) {
        const start = queryStart || (allDates.length ? new Date(allDates[0]) : null);
        const end = queryEnd || (allDates.length ? new Date(allDates[allDates.length - 1]) : null);
        
        if (start && end) {
            const generatedDates = [];
            const current = new Date(start);
            while (current <= end) {
                generatedDates.push(current.toISOString().split('T')[0]);
                current.setUTCDate(current.getUTCDate() + 1);
            }
            allDates = [...new Set([...allDates, ...generatedDates])].sort();
        }
    }

    // If no date range provided, from/to will reflect actual data bounds
    const from = startDate ? new Date(startDate) : (allDates.length ? new Date(allDates[0]) : null);
    const to   = endDate   ? new Date(endDate)   : (allDates.length ? new Date(allDates[allDates.length - 1]) : null);

    // 5. Construct the report tree
    const report = departments.map(dept => ({
        department: {
            id:   dept.id,
            name: dept.name,
            code: dept.departmentCode,
        },
        years: dept.years.map(year => {
            const deptStudents = studentsByDeptYear[dept.id] || {};
            const yearStudents = deptStudents[year.id] || new Set();
            // Fall back to total institution students if none are assigned to this dept/year
            const totalStudents = yearStudents.size || totalInstitutionStudents;
            
            const deptPresence = presenceMap[dept.id] || {};
            const yearPresence = deptPresence[year.id] || {};
            const subjectsList = year.Subjects || year.subjects || [];

            const subjects = subjectsList.map(sub => {
                const subDates = yearPresence[sub.id] || {};

                const days = allDates.map(date => {
                    const hasSession = subDates.hasOwnProperty(date);
                    const presentMap = subDates[date] || new Map();
                    const present = presentMap.size;
                    const absent = hasSession ? totalStudents - present : 0;
                    const dayTotal = hasSession ? totalStudents : 0;
                    const studentsPresent = Array.from(presentMap.values());
                    
                    return {
                        date,
                        present,
                        absent: Math.max(absent, 0),
                        total: dayTotal,
                        attendanceRate: dayTotal > 0 ? +((present / dayTotal) * 100).toFixed(1) : 0,
                        isSession: hasSession,
                        studentsPresent,
                    };
                });

                const sessionDays = days.filter(d => d.isSession);
                const avgRate = sessionDays.length
                    ? +(sessionDays.reduce((sum, d) => sum + d.attendanceRate, 0) / sessionDays.length).toFixed(1)
                    : 0;

                return {
                    subject: {
                        id: sub.id,
                        name: sub.name,
                        code: sub.code
                    },
                    averageAttendanceRate: avgRate,
                    days,
                };
            });

            return {
                year: { id: year.id, name: year.name },
                totalStudents,
                subjects,
            };
        }),
    }));

    return res.json(new ApiResponse(200, {
        report,
        meta: {
            from: from ? formatDate(from) : null,
            to:   to   ? formatDate(to)   : null,
            totalDays: allDates.length,
            dates: allDates,
        },
    }, 'Department-year-subject daily attendance report'));
});

module.exports = {
    getAttendanceCsv,
    getAttendanceStats,
    getStudentAttendance,
    getDeptYearDailyAttendance,
    getSubjectDayAttendees,
    getDeptYearSubjectDailyAttendance,
};
