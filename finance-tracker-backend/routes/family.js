/**
 * routes/family.js — Family Finance Group API
 * POST   /api/family/create      — Create a new family group
 * POST   /api/family/join        — Join via invite code
 * GET    /api/family             — Get my family group (if any)
 * GET    /api/family/dashboard   — Combined member spending view
 * DELETE /api/family/leave       — Leave the group
 */
const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/protect');
const Family   = require('../models/Family');
const Transaction = require('../models/Transaction');
const User     = require('../models/User');

// ── Generate a 6-char invite code ─────────────────────────────────────────────
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ── POST /api/family/create ────────────────────────────────────────────────────
router.post('/create', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const existing = await Family.findOne({ members: uid });
    if (existing) return res.status(409).json({ error: 'You are already in a family group. Leave it first.' });

    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Family name is required' });

    let inviteCode, collision = true;
    while (collision) {
      inviteCode = genCode();
      collision  = await Family.exists({ inviteCode });
    }

    const family = await Family.create({
      name:       name.trim(),
      createdBy:  uid,
      members:    [uid],
      inviteCode,
    });

    res.status(201).json(family);
  } catch (err) {
    console.error('[family/create]', err);
    res.status(500).json({ error: 'Failed to create family group' });
  }
});

// ── POST /api/family/join ──────────────────────────────────────────────────────
router.post('/join', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });

    const existing = await Family.findOne({ members: uid });
    if (existing) return res.status(409).json({ error: 'You are already in a family group' });

    const family = await Family.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!family) return res.status(404).json({ error: 'Invalid invite code' });

    if (!family.members.includes(uid)) {
      family.members.push(uid);
      await family.save();
    }

    res.json(family);
  } catch (err) {
    console.error('[family/join]', err);
    res.status(500).json({ error: 'Failed to join family group' });
  }
});

// ── GET /api/family ────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const family = await Family.findOne({ members: req.user.id })
      .populate('members', 'username email')
      .populate('createdBy', 'username');
    if (!family) return res.json(null);
    res.json(family);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch family' });
  }
});

// ── GET /api/family/dashboard ──────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const family = await Family.findOne({ members: req.user.id }).populate('members', 'username email');
    if (!family) return res.status(404).json({ error: 'Not in a family group' });

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const memberData = await Promise.all(
      family.members.map(async (member) => {
        const txns = await Transaction.find({
          userId: member._id,
          date:   { $gte: monthStart },
          isRecurring: false,
        }).sort({ date: -1 }).limit(50).lean();

        const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const catMap   = txns.filter(t => t.type === 'expense')
          .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

        return {
          member:     { id: member._id, username: member.username, email: member.email },
          income,
          expenses,
          net:        income - expenses,
          catMap,
          recentTxns: txns.slice(0, 5),
        };
      })
    );

    const combined = {
      income:   memberData.reduce((s, m) => s + m.income, 0),
      expenses: memberData.reduce((s, m) => s + m.expenses, 0),
    };
    combined.net = combined.income - combined.expenses;

    res.json({ family, memberData, combined });
  } catch (err) {
    console.error('[family/dashboard]', err);
    res.status(500).json({ error: 'Failed to load family dashboard' });
  }
});

// ── DELETE /api/family/leave ───────────────────────────────────────────────────
router.delete('/leave', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const family = await Family.findOne({ members: uid });
    if (!family) return res.status(404).json({ error: 'Not in a family group' });

    family.members = family.members.filter(m => m.toString() !== uid);

    if (family.members.length === 0) {
      await family.deleteOne();
      return res.json({ message: 'Family group dissolved (last member left)' });
    }

    if (family.createdBy.toString() === uid) {
      family.createdBy = family.members[0];
    }

    await family.save();
    res.json({ message: 'Left family group' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave family group' });
  }
});

module.exports = router;
