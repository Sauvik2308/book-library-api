const app = require('./server');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Book Library API Server running on http://localhost:${PORT}`);
    console.log(`API Documentation:`);
    console.log(`  Books API: http://localhost:${PORT}/api/books`);
    console.log(`  Members API: http://localhost:${PORT}/api/members`);
    console.log(`  Borrowings API: http://localhost:${PORT}/api/borrowings`);
    console.log(`  Statistics API: http://localhost:${PORT}/api/stats`);
});
