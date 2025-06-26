# PDF Organizer

A modern web-based PDF organizer application that helps you organize, search, and manage your PDF files with ease. Built with Flask and featuring a clean, responsive Bootstrap interface.

## Features

### 📁 File Organization
- **Automatic categorization** - Organize PDFs into categories like Documents, Books, Reports, etc.
- **Folder structure** - Files are automatically organized into category-based folders
- **Duplicate detection** - Prevents duplicate files using MD5 hashing
- **Metadata extraction** - Automatically extracts page count and file information

### 🔍 Search & Discovery
- **Full-text search** - Search through filenames, original names, and descriptions
- **Category filtering** - Filter files by specific categories
- **Advanced search** - Combine text search with category filters
- **Real-time results** - Fast search results with detailed file information

### 📄 PDF Operations
- **File viewing** - View PDFs directly in your browser
- **File downloading** - Download files with original names
- **PDF merging** - Combine multiple PDFs into a single document
- **Batch operations** - Select multiple files for merging

### 💻 Modern Interface
- **Responsive design** - Works on desktop, tablet, and mobile devices
- **Bootstrap 5** - Modern, clean user interface
- **Font Awesome icons** - Beautiful iconography throughout
- **Intuitive navigation** - Easy-to-use interface with clear workflows

## Installation

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)

### Setup

1. **Clone or download the project**
   ```bash
   # Or download the files to your preferred directory
   cd pdf-organizer
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the application**
   Open your web browser and go to: `http://localhost:5000`

## Usage Guide

### Getting Started

1. **Launch the application** - Run `python app.py` and open `http://localhost:5000`
2. **Upload your first PDF** - Click "Add PDF" or use the Upload page
3. **Choose a category** - Select from default categories or create new ones
4. **Add descriptions** - Optionally add descriptions to make files easier to find

### Uploading Files

1. Navigate to the **Upload** page
2. Select a PDF file (max 50MB)
3. Choose a category from the dropdown
4. Add an optional description
5. Click "Upload PDF"

**Tips:**
- Only PDF files are supported
- Duplicate files are automatically detected
- Files are organized into category folders
- Use descriptions to make files searchable

### Searching Files

**Quick Search:**
- Use the search bar in the navigation
- Search through filenames and descriptions
- Results appear instantly

**Advanced Search:**
- Use the search page for more options
- Combine text search with category filters
- View detailed results with file information

### Merging PDFs

1. Go to the **Merge PDFs** page
2. Select 2 or more files to merge
3. Enter a name for the merged document
4. Click "Merge Selected Files"
5. The new merged PDF will appear in the "Merged" category

### Managing Files

**Viewing Files:**
- Click the "View" button to open PDFs in your browser
- Files open in a new tab for easy viewing

**Deleting Files:**
- Click the "Delete" button on any file card
- Confirm the deletion in the popup dialog
- Files are removed from both the database and filesystem

**Organizing:**
- Files are automatically organized by category
- Categories create separate folders in the `organized/` directory
- Use the category filter buttons to browse by category

## File Structure

```
pdf-organizer/
├── app.py                 # Main application file
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/            # HTML templates
│   ├── base.html         # Base template with navigation
│   ├── index.html        # Main dashboard
│   ├── upload.html       # Upload form
│   ├── merge.html        # PDF merge interface
│   └── search_results.html # Search results page
├── static/               # Static files (CSS, JS)
│   ├── css/
│   └── js/
├── uploads/              # Temporary upload directory
├── organized/            # Organized PDF files by category
│   ├── Documents/
│   ├── Books/
│   ├── Reports/
│   └── ...
└── pdf_organizer.db      # SQLite database (created automatically)
```

## Configuration

### Default Categories
The application comes with these default categories:
- Documents
- Books  
- Reports
- Manuals
- Articles
- Forms
- Presentations
- Uncategorized

You can add more categories through the application interface.

### File Limits
- Maximum file size: 50MB per PDF
- Supported format: PDF only
- No limit on number of files

### Database
- Uses SQLite for simplicity
- Database file: `pdf_organizer.db`
- Automatically created on first run

## Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
pip install -r requirements.txt
```

**Port already in use:**
- Change the port in `app.py` (last line): `app.run(port=5001)`
- Or kill the process using port 5000

**Permission errors:**
- Ensure you have write permissions in the application directory
- The app needs to create `uploads/` and `organized/` folders

**PDF files not displaying:**
- Ensure your browser supports PDF viewing
- Check browser settings for PDF handling

### Development Mode
The application runs in debug mode by default. For production use:
1. Set `debug=False` in `app.py`
2. Change the secret key to a secure random value
3. Use a production WSGI server like Gunicorn

## Technical Details

### Dependencies
- **Flask** - Web framework
- **Werkzeug** - WSGI utilities and file handling
- **pypdf** - PDF processing and manipulation
- **SQLite** - Database (built into Python)
- **Bootstrap 5** - Frontend framework (CDN)
- **Font Awesome** - Icons (CDN)

### Security Features
- File type validation (PDF only)
- Secure filename handling
- Duplicate detection
- File size limits
- SQL injection protection

### Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Contributing

This is a standalone application. To extend functionality:

1. **Add new routes** in `app.py`
2. **Create new templates** in `templates/`
3. **Add CSS/JS** in `static/`
4. **Modify database schema** in the `init_db()` function

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Ensure Python 3.7+ is being used
4. Check file permissions in the application directory 