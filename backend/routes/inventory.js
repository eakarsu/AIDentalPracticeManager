const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, category, sku, quantity, unit, unit_cost, reorder_level, supplier, notes } = req.body;
    const result = await db.query(
      `INSERT INTO inventory (name, category, sku, quantity, unit, unit_cost, reorder_level, supplier, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, category, sku, quantity, unit, unit_cost, reorder_level, supplier, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, category, sku, quantity, unit, unit_cost, reorder_level, supplier, notes } = req.body;
    const result = await db.query(
      `UPDATE inventory SET name=$1, category=$2, sku=$3, quantity=$4, unit=$5,
       unit_cost=$6, reorder_level=$7, supplier=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, category, sku, quantity, unit, unit_cost, reorder_level, supplier, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock (add/remove)
router.post('/:id/adjust', authenticateToken, async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    const result = await db.query(
      `UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [adjustment, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory WHERE quantity <= reorder_level ORDER BY quantity ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
