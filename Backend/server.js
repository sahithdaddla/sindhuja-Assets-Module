const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'postgres',
    database: 'asset_management',
    password: 'admin123',
    port: 5432,
});

// Submit a new asset request
app.post('/api/requests', async (req, res) => {
    const { employeeId, employeeName, assetType, otherAsset, reason } = req.body;
    
    try {
        // Check for duplicate request on the same day
        const duplicateCheck = await pool.query(
            'SELECT * FROM asset_requests WHERE employee_id = $1 AND DATE(request_date) = CURRENT_DATE',
            [employeeId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'You have already submitted a request today with this Employee ID'
            });
        }

        const result = await pool.query(
            `INSERT INTO asset_requests (
                employee_id, 
                employee_name, 
                asset_type, 
                other_asset, 
                reason, 
                status, 
                request_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                employeeId,
                employeeName,
                assetType,
                otherAsset || '',
                reason,
                'pending',
                new Date()
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all requests with pagination and filtering
app.get('/api/requests', async (req, res) => {
    const { page = 1, status, search } = req.query;
    const itemsPerPage = 5;
    const offset = (page - 1) * itemsPerPage;

    try {
        let query = 'SELECT * FROM asset_requests';
        const queryParams = [];
        let whereClauses = [];

        if (status && status !== 'all') {
            whereClauses.push('status = $1');
            queryParams.push(status);
        }

        if (search) {
            const paramIndex = queryParams.length + 1;
            whereClauses.push(`(
                employee_id ILIKE $${paramIndex} OR 
                employee_name ILIKE $${paramIndex} OR 
                asset_type ILIKE $${paramIndex} OR 
                other_asset ILIKE $${paramIndex} OR 
                reason ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY request_date DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(itemsPerPage, offset);

        const result = await pool.query(query, queryParams);
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM asset_requests${whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : ''}`,
            queryParams.slice(0, -2)
        );

        res.json({
            requests: result.rows,
            totalCount: parseInt(countResult.rows[0].count),
            totalPages: Math.ceil(countResult.rows[0].count / itemsPerPage)
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update request status
app.patch('/api/requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await pool.query(
            'UPDATE asset_requests SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete all requests
app.delete('/api/requests', async (req, res) => {
    try {
        await pool.query('DELETE FROM asset_requests');
        res.json({ message: 'All requests deleted successfully' });
    } catch (error) {
        console.error('Error deleting requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get request by ID
app.get('/api/requests/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM asset_requests WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stats
app.get('/api/stats', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM asset_requests');
        const pending = await pool.query('SELECT COUNT(*) FROM asset_requests WHERE status = $1', ['pending']);
        const approved = await pool.query('SELECT COUNT(*) FROM asset_requests WHERE status = $1', ['approved']);
        const rejected = await pool.query('SELECT COUNT(*) FROM asset_requests WHERE status = $1', ['rejected']);

        res.json({
            total: parseInt(total.rows[0].count),
            pending: parseInt(pending.rows[0].count),
            approved: parseInt(approved.rows[0].count),
            rejected: parseInt(rejected.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://13.53.49.44:${port}`);
});