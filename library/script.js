// ⚠️ REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://mjiwhngjfmqghuvxuggs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaXdobmdqZm1xZ2h1dnh1Z2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwODcyMTksImV4cCI6MjA3ODY2MzIxOX0.7KsDJ5owqtEcBiYdBabz4paQWTk8-bPcn_okF4uqcmI';

// Initialize Supabase client (requires the supabase script loaded in <head>)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Show alert message
function showAlert(elementId, message, type) {
    const alertDiv = document.getElementById(elementId);
    alertDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 3000);
}

// Fetch all books
async function fetchBooks() {
    try {
        const { data: books, error } = await supabase
            .from('books')
            .select('*')
            .order('id', { ascending: false });
        
        if (error) throw error;
        
        displayBooks(books);
        updateBookDropdown(books);
    } catch (error) {
        document.getElementById('booksGrid').innerHTML = 
            `<div class="empty-state">Error loading books: ${error.message}</div>`;
    }
}

// Fetch borrowed books
async function fetchBorrowedBooks() {
    try {
        const { data: borrowedBooks, error } = await supabase
            .from('borrowed_books')
            .select(`
                *,
                books (title)
            `)
            .eq('returned', false)
            .order('borrow_date', { ascending: false });
        
        if (error) throw error;
        
        displayBorrowedBooks(borrowedBooks);
    } catch (error) {
        document.getElementById('borrowedList').innerHTML = 
            `<div class="empty-state">Error loading borrowed books: ${error.message}</div>`;
    }
}

// Display books
function displayBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    booksGrid.innerHTML = '';

    if (books.length === 0) {
        booksGrid.innerHTML = '<div class="empty-state">No books in the library yet. Add some books!</div>';
    } else {
        books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.innerHTML = `
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${book.author}</div>
                <div class="book-isbn">ISBN: ${book.isbn}</div>
                <span class="book-status ${book.available ? 'available' : 'borrowed'}">
                    ${book.available ? '✓ Available' : '✗ Borrowed'}
                </span>
            `;
            booksGrid.appendChild(bookCard);
        });
    }
}

// Update book dropdown
function updateBookDropdown(books) {
    const selectBook = document.getElementById('selectBook');
    selectBook.innerHTML = '<option value="">-- Choose a book --</option>';
    
    books.filter(b => b.available).forEach(book => {
        const option = document.createElement('option');
        option.value = book.id;
        option.textContent = `${book.title} - ${book.author}`;
        selectBook.appendChild(option);
    });
}

// Display borrowed books
function displayBorrowedBooks(borrowedBooks) {
    const borrowedList = document.getElementById('borrowedList');
    borrowedList.innerHTML = '';

    if (borrowedBooks.length === 0) {
        borrowedList.innerHTML = '<div class="empty-state">No books currently borrowed.</div>';
    } else {
        borrowedBooks.forEach(borrowed => {
            const borrowedItem = document.createElement('div');
            borrowedItem.className = 'borrowed-item';
            borrowedItem.innerHTML = `
                <div class="borrowed-info">
                    <div class="book-title">${borrowed.books.title}</div>
                    <div class="borrowed-date">Borrowed by: ${borrowed.borrower_name} | Date: ${borrowed.borrow_date}</div>
                </div>
                <button class="return-btn" onclick="returnBook(${borrowed.id}, ${borrowed.book_id})">Return Book</button>
            `;
            borrowedList.appendChild(borrowedItem);
        });
    }
}

// Add new book
document.getElementById('addBookForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('addBookBtn');
    btn.disabled = true;
    btn.textContent = 'Adding...';
    
    try {
        const { data, error } = await supabase
            .from('books')
            .insert([
                {
                    title: document.getElementById('bookTitle').value,
                    author: document.getElementById('bookAuthor').value,
                    isbn: document.getElementById('bookISBN').value,
                    available: true
                }
            ]);

        if (error) throw error;

        showAlert('addBookAlert', 'Book added successfully!', 'success');
        this.reset();
        fetchBooks();
    } catch (error) {
        showAlert('addBookAlert', 'Error: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Add Book to Library';
});

// Borrow book
document.getElementById('borrowForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = document.getElementById('borrowBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    
    const bookId = document.getElementById('selectBook').value;
    const borrowerName = document.getElementById('borrowerName').value;

    try {
        // Add to borrowed_books
        const { error: borrowError } = await supabase
            .from('borrowed_books')
            .insert([
                {
                    book_id: bookId,
                    borrower_name: borrowerName,
                    borrow_date: new Date().toISOString().split('T')[0],
                    returned: false
                }
            ]);

        if (borrowError) throw borrowError;

        // Update book availability
        const { error: updateError } = await supabase
            .from('books')
            .update({ available: false })
            .eq('id', bookId);

        if (updateError) throw updateError;

        showAlert('borrowAlert', 'Book borrowed successfully!', 'success');
        this.reset();
        fetchBooks();
        fetchBorrowedBooks();
    } catch (error) {
        showAlert('borrowAlert', 'Error: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Borrow Book';
});

// Return book
async function returnBook(borrowId, bookId) {
    if (!confirm('Are you sure you want to return this book?')) return;

    try {
        // Update borrowed_books
        const { error: returnError } = await supabase
            .from('borrowed_books')
            .update({ 
                returned: true,
                return_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', borrowId);

        if (returnError) throw returnError;

        // Update book availability
        const { error: updateError } = await supabase
            .from('books')
            .update({ available: true })
            .eq('id', bookId);

        if (updateError) throw updateError;

        fetchBooks();
        fetchBorrowedBooks();
    } catch (error) {
        alert('Error returning book: ' + error.message);
    }
}

// Initialize - load data on page load
document.addEventListener('DOMContentLoaded', function() {
    fetchBooks();
    fetchBorrowedBooks();
});
