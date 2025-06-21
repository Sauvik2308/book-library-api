const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static frontend files

// Database setup
const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Books table
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE,
        genre TEXT,
        publication_year INTEGER,
        available_copies INTEGER DEFAULT 1,
        total_copies INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Members table
    db.run(`CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        membership_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        active INTEGER DEFAULT 1
    )`);

    // Borrowing records table
    db.run(`CREATE TABLE IF NOT EXISTS borrowings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        member_id INTEGER,
        borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME,
        return_date DATETIME,
        status TEXT DEFAULT 'borrowed',
        FOREIGN KEY (book_id) REFERENCES books (id),
        FOREIGN KEY (member_id) REFERENCES members (id)
    )`);

    // Insert sample data
    insertSampleData();
}

// Insert sample data
function insertSampleData() {
    const sampleBooks = [
        ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0-7432-7356-5', 'Fiction', 1925, 3, 3],
        ['To Kill a Mockingbird', 'Harper Lee', '978-0-06-112008-4', 'Fiction', 1960, 2, 2],
        ['1984', 'George Orwell', '978-0-452-28423-4', 'Dystopian Fiction', 1949, 4, 4],
        ['Pride and Prejudice', 'Jane Austen', '978-0-14-143951-8', 'Romance', 1813, 2, 2]
    ];

    const sampleMembers = [
        ['John Doe', 'john.doe@email.com', '+1-555-0123'],
        ['Jane Smith', 'jane.smith@email.com', '+1-555-0124'],
        ['Bob Johnson', 'bob.johnson@email.com', '+1-555-0125']
    ];

    // Check if data already exists before inserting
    db.get("SELECT COUNT(*) as count FROM books", (err, row) => {
        if (!err && row.count === 0) {
            const stmt = db.prepare("INSERT INTO books (title, author, isbn, genre, publication_year, available_copies, total_copies) VALUES (?, ?, ?, ?, ?, ?, ?)");
            sampleBooks.forEach(book => stmt.run(book));
            stmt.finalize();
        }
    });

    db.get("SELECT COUNT(*) as count FROM members", (err, row) => {
        if (!err && row.count === 0) {
            const stmt = db.prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, ?)");
            sampleMembers.forEach(member => stmt.run(member));
            stmt.finalize();
        }
    });
}

// API Routes

// 1. Books API Endpoints
// GET /api/books - Get all books
app.get('/api/books', (req, res) => {
    const { genre, available_only } = req.query;
    let query = "SELECT * FROM books";
    let params = [];

    if (genre || available_only) {
        query += " WHERE ";
        const conditions = [];
        
        if (genre) {
            conditions.push("genre LIKE ?");
            params.push(`%${genre}%`);
        }
        
        if (available_only === 'true') {
            conditions.push("available_copies > 0");
        }
        
        query += conditions.join(" AND ");
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ books: rows });
        }
    });
});

// GET /api/books/:id - Get specific book
app.get('/api/books/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM books WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Book not found' });
        } else {
            res.json({ book: row });
        }
    });
});

// POST /api/books - Add new book
app.post('/api/books', (req, res) => {
    const { title, author, isbn, genre, publication_year, total_copies = 1 } = req.body;
    
    if (!title || !author) {
        return res.status(400).json({ error: 'Title and author are required' });
    }

    const stmt = db.prepare(`INSERT INTO books (title, author, isbn, genre, publication_year, available_copies, total_copies) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run([title, author, isbn, genre, publication_year, total_copies, total_copies], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ 
                message: 'Book added successfully', 
                book: { id: this.lastID, title, author, isbn, genre, publication_year, total_copies }
            });
        }
    });
});

// PUT /api/books/:id - Update book
app.put('/api/books/:id', (req, res) => {
    const id = req.params.id;
    const { title, author, isbn, genre, publication_year, total_copies } = req.body;
    
    const stmt = db.prepare(`UPDATE books 
                             SET title = ?, author = ?, isbn = ?, genre = ?, publication_year = ?, total_copies = ?
                             WHERE id = ?`);
    
    stmt.run([title, author, isbn, genre, publication_year, total_copies, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Book not found' });
        } else {
            res.json({ message: 'Book updated successfully' });
        }
    });
});

// DELETE /api/books/:id - Delete book
app.delete('/api/books/:id', (req, res) => {
    const id = req.params.id;
    
    db.run("DELETE FROM books WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Book not found' });
        } else {
            res.json({ message: 'Book deleted successfully' });
        }
    });
});

// 2. Members API Endpoints
// GET /api/members - Get all members
app.get('/api/members', (req, res) => {
    const { active_only } = req.query;
    let query = "SELECT * FROM members";
    
    if (active_only === 'true') {
        query += " WHERE active = 1";
    }

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ members: rows });
        }
    });
});

// POST /api/members - Add new member
app.post('/api/members', (req, res) => {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    const stmt = db.prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, ?)");
    
    stmt.run([name, email, phone], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'Email already exists' });
            } else {
                res.status(500).json({ error: err.message });
            }
        } else {
            res.status(201).json({ 
                message: 'Member added successfully', 
                member: { id: this.lastID, name, email, phone }
            });
        }
    });
});

// 3. Borrowing API Endpoints
// GET /api/borrowings - Get all borrowing records
app.get('/api/borrowings', (req, res) => {
    const { status, member_id } = req.query;
    let query = `SELECT b.*, books.title as book_title, books.author as book_author, 
                        members.name as member_name, members.email as member_email
                 FROM borrowings b
                 JOIN books ON b.book_id = books.id
                 JOIN members ON b.member_id = members.id`;
    let params = [];

    if (status || member_id) {
        query += " WHERE ";
        const conditions = [];
        
        if (status) {
            conditions.push("b.status = ?");
            params.push(status);
        }
        
        if (member_id) {
            conditions.push("b.member_id = ?");
            params.push(member_id);
        }
        
        query += conditions.join(" AND ");
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ borrowings: rows });
        }
    });
});

// POST /api/borrowings - Borrow a book
app.post('/api/borrowings', (req, res) => {
    const { book_id, member_id, days = 14 } = req.body;
    
    if (!book_id || !member_id) {
        return res.status(400).json({ error: 'Book ID and Member ID are required' });
    }

    // Check if book is available
    db.get("SELECT available_copies FROM books WHERE id = ?", [book_id], (err, book) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        if (book.available_copies <= 0) {
            return res.status(400).json({ error: 'Book not available' });
        }

        // Create borrowing record and update available copies
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Insert borrowing record
            db.run("INSERT INTO borrowings (book_id, member_id, due_date) VALUES (?, ?, ?)", 
                   [book_id, member_id, dueDate.toISOString()], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                
                // Update available copies
                db.run("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", 
                       [book_id], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    
                    db.run("COMMIT");
                    res.status(201).json({ 
                        message: 'Book borrowed successfully', 
                        borrowing_id: this.lastID 
                    });
                });
            });
        });
    });
});

// PUT /api/borrowings/:id/return - Return a book
app.put('/api/borrowings/:id/return', (req, res) => {
    const id = req.params.id;
    
    // Get borrowing details
    db.get("SELECT * FROM borrowings WHERE id = ? AND status = 'borrowed'", [id], (err, borrowing) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!borrowing) {
            return res.status(404).json({ error: 'Active borrowing not found' });
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Update borrowing record
            db.run("UPDATE borrowings SET return_date = CURRENT_TIMESTAMP, status = 'returned' WHERE id = ?", 
                   [id], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }
                
                // Update available copies
                db.run("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?", 
                       [borrowing.book_id], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: err.message });
                    }
                    
                    db.run("COMMIT");
                    res.json({ message: 'Book returned successfully' });
                });
            });
        });
    });
});

// 4. Statistics API Endpoint
// GET /api/stats - Get library statistics
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    // Get total books
    db.get("SELECT COUNT(*) as total, SUM(available_copies) as available FROM books", (err, bookStats) => {
        if (err) return res.status(500).json({ error: err.message });
        
        stats.total_books = bookStats.total;
        stats.available_books = bookStats.available;
        stats.borrowed_books = bookStats.total - bookStats.available;
        
        // Get total members
        db.get("SELECT COUNT(*) as total FROM members WHERE active = 1", (err, memberStats) => {
            if (err) return res.status(500).json({ error: err.message });
            
            stats.active_members = memberStats.total;
            
            // Get borrowing stats
            db.get("SELECT COUNT(*) as active FROM borrowings WHERE status = 'borrowed'", (err, borrowingStats) => {
                if (err) return res.status(500).json({ error: err.message });
                
                stats.active_borrowings = borrowingStats.active;
                
                // Get overdue books
                db.get("SELECT COUNT(*) as overdue FROM borrowings WHERE status = 'borrowed' AND due_date < datetime('now')", 
                       (err, overdueStats) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    stats.overdue_books = overdueStats.overdue;
                    
                    res.json({ stats });
                });
            });
        });
    });
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Book Library API Server running on http://localhost:${PORT}`);
    console.log(`API Documentation:`);
    console.log(`  Books API: http://localhost:${PORT}/api/books`);
    console.log(`  Members API: http://localhost:${PORT}/api/members`);
    console.log(`  Borrowings API: http://localhost:${PORT}/api/borrowings`);
    console.log(`  Statistics API: http://localhost:${PORT}/api/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});