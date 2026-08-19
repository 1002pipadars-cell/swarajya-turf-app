const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory Database Store
let appData = {
  settings: { upiId: "swarajyaturf@upi" },
  games: [
    { id: "1", name: "Box Cricket", description: "7v7 High-octane arena cricket", MorningRate: 800, EveningRate: 1200, NightRate: 1500 },
    { id: "2", name: "Football Turf", description: "5v5 FIFA standard turf ground", MorningRate: 1000, EveningRate: 1400, NightRate: 1800 }
  ],
  slots: [
    { id: "S1", start: "06:00 AM", end: "07:00 AM", period: "Morning", defaultRate: 800, bookingAmount: 300, booked: false },
    { id: "S2", start: "07:00 AM", end: "08:00 AM", period: "Morning", defaultRate: 800, bookingAmount: 300, booked: false },
    { id: "S3", start: "06:00 PM", end: "07:00 PM", period: "Evening", defaultRate: 1200, bookingAmount: 500, booked: false },
    { id: "S4", start: "07:00 PM", end: "08:00 PM", period: "Evening", defaultRate: 1200, bookingAmount: 500, booked: false },
    { id: "S5", start: "08:00 PM", end: "09:00 PM", period: "Night", defaultRate: 1500, bookingAmount: 500, booked: false }
  ],
  bookings: []
};

// API Routes
app.get('/api/getAppData', (req, res) => {
  res.json(appData);
});

app.get('/api/getAvailability', (req, res) => {
  const { date, gameId } = req.query;
  const bookedSlotIds = appData.bookings
    .filter(b => b.bookingDate === date && b.paymentStatus !== 'REJECTED')
    .flatMap(b => String(b.slotId).split(','));

  const slots = appData.slots.map(s => ({
    ...s,
    booked: bookedSlotIds.includes(String(s.id))
  }));

  res.json({ closed: false, slots });
});

app.post('/api/createBooking', (req, res) => {
  const payload = req.body;
  const bookingId = 'SWJ-' + Math.floor(100000 + Math.random() * 900000);
  
  const newBooking = {
    bookingId,
    ...payload,
    paymentStatus: 'DRAFT',
    createdAt: new Date().toISOString()
  };
  
  appData.bookings.push(newBooking);
  res.json(newBooking);
});

app.post('/api/submitPaymentConfirmation', (req, res) => {
  const { bookingId } = req.body;
  const booking = appData.bookings.find(b => b.bookingId === bookingId);
  if (booking) {
    booking.paymentStatus = 'PENDING';
  }
  res.json({ success: true, booking });
});

app.get('/api/getBookingStatus', (req, res) => {
  const { query } = req.query;
  const matches = appData.bookings.filter(b => 
    b.bookingId.toUpperCase() === String(query).toUpperCase() || 
    b.phone === query
  );
  res.json(matches);
});

app.post('/api/adminLogin', (req, res) => {
  const { email, pin } = req.body;
  if (email === "admin@swarajya.com" && pin === "1234") {
    res.json({ token: "admin-secret-token", name: "Admin", email });
  } else {
    res.status(401).json({ message: "Invalid Admin Credentials" });
  }
});

app.get('/api/getAdminDashboard', (req, res) => {
  const summary = {
    total: appData.bookings.length,
    pending: appData.bookings.filter(b => b.paymentStatus === 'PENDING').length,
    confirmed: appData.bookings.filter(b => b.paymentStatus === 'CONFIRMED').length,
    revenue: appData.bookings.filter(b => b.paymentStatus === 'CONFIRMED').reduce((acc, b) => acc + Number(b.amount || 0), 0)
  };
  res.json({ summary, bookings: appData.bookings, slots: appData.slots });
});

app.post('/api/adminApprove', (req, res) => {
  const { bookingId } = req.body;
  const b = appData.bookings.find(x => x.bookingId === bookingId);
  if (b) b.paymentStatus = 'CONFIRMED';
  res.json({ success: true });
});

app.post('/api/adminReject', (req, res) => {
  const { bookingId, reason } = req.body;
  const b = appData.bookings.find(x => x.bookingId === bookingId);
  if (b) {
    b.paymentStatus = 'REJECTED';
    b.notes = reason;
  }
  res.json({ success: true });
});

module.exports = app;
