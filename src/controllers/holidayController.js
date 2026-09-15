const prisma = require('../config/db');

// GET /holidays — everyone can view; returns upcoming holidays only, soonest first
async function listUpcomingHolidays(req, res) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: today } },
        orderBy: { date: 'asc' },
        take: 5,
    });
    res.json(holidays);
}

// POST /holidays — Admin adds a holiday
async function createHoliday(req, res) {
    const { name, date, description, isMandatory } = req.body;
    if (!name || !date) {
        return res.status(400).json({ error: 'name and date are required' });
    }
    try {
        const holiday = await prisma.holiday.create({
            data: {
                name,
                date: new Date(date),
                description: description || null,
                isMandatory: isMandatory !== undefined ? isMandatory : true,
            },
        });
        res.status(201).json(holiday);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create holiday' });
    }
}
// GET /holidays/all — Admin sees every holiday, past and future
async function listAllHolidays(req, res) {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    res.json(holidays);
}

// DELETE /holidays/:id — Admin removes a holiday
async function deleteHoliday(req, res) {
    const { id } = req.params;
    try {
        await prisma.holiday.delete({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(404).json({ error: 'Holiday not found' });
    }
}

module.exports = { listUpcomingHolidays, createHoliday, listAllHolidays, deleteHoliday };