const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

// POST /salary-slips — Admin/HR creates a slip and generates its PDF
async function createSlip(req, res) {
  const { employeeId, month, year, basic, allowances, deductions } = req.body;
  if (!employeeId || !month || !year || basic == null) {
    return res.status(400).json({ error: 'employeeId, month, year, and basic are required' });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const netPay = parseFloat(basic) + parseFloat(allowances || 0) - parseFloat(deductions || 0);

    const slip = await prisma.salarySlip.upsert({
      where: { employeeId_month_year: { employeeId, month: parseInt(month), year: parseInt(year) } },
      update: { basic, allowances: allowances || 0, deductions: deductions || 0, netPay },
      create: { employeeId, month: parseInt(month), year: parseInt(year), basic, allowances: allowances || 0, deductions: deductions || 0, netPay },
    });

    // Generate PDF
    const payslipDir = path.join('uploads', 'payslips');
    if (!fs.existsSync(payslipDir)) fs.mkdirSync(payslipDir, { recursive: true });
    const fileName = `payslip-${slip.id}.pdf`;
    const filePath = path.join(payslipDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(18).text('Salary Slip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${employee.name}`);
    doc.text(`Period: ${month}/${year}`);
    doc.moveDown();
    doc.text(`Basic: ₹${basic}`);
    doc.text(`Allowances: ₹${allowances || 0}`);
    doc.text(`Deductions: ₹${deductions || 0}`);
    doc.moveDown();
    doc.fontSize(14).text(`Net Pay: ₹${netPay}`, { underline: true });
    doc.end();

    const fileUrl = `/uploads/payslips/${fileName}`;
    const updated = await prisma.salarySlip.update({ where: { id: slip.id }, data: { fileUrl } });

    await prisma.notification.create({
      data: {
        employeeId,
        title: 'Salary Slip Available',
        message: `Your salary slip for ${month}/${year} is ready.`,
        type: 'SALARY_SLIP',
        relatedId: slip.id,
      },
    });

    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create salary slip' });
  }
}

// GET /salary-slips/me — employee's own slips
async function mySlips(req, res) {
  const slips = await prisma.salarySlip.findMany({
    where: { employeeId: req.employee.id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json(slips);
}

// GET /salary-slips — Admin/HR views everyone's slips
async function listAllSlips(req, res) {
  const slips = await prisma.salarySlip.findMany({
    include: { employee: { select: { id: true, name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json(slips);
}

module.exports = { createSlip, mySlips, listAllSlips };