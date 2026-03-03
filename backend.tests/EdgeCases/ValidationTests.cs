using Core.Auth.Models;
using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.Models;

namespace MusicasIgreja.Api.Tests.EdgeCases;

public class ValidationTests : IDisposable
{
    private readonly AppDbContext _context;

    public ValidationTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region PdfFile Validation Tests

    [Fact]
    public async Task PdfFile_CanBeSavedWithValidData()
    {
        _context.PdfFiles.Add(new PdfFile
        {
            Filename = "file1.pdf",
            OriginalName = "original1.pdf",
            FilePath = "organized/file1.pdf",
            FileHash = "unique_hash_1"
        });
        await _context.SaveChangesAsync();

        var savedFile = await _context.PdfFiles.FirstAsync(f => f.FileHash == "unique_hash_1");
        Assert.NotNull(savedFile);
        Assert.Equal("file1.pdf", savedFile.Filename);
    }

    [Fact]
    public async Task Category_CanBeSavedWithValidData()
    {
        _context.Categories.Add(new Category { Name = "Entrada" });
        _context.Categories.Add(new Category { Name = "Comunhão" });
        await _context.SaveChangesAsync();

        var categories = await _context.Categories.ToListAsync();
        Assert.Equal(2, categories.Count);
    }

    [Fact]
    public async Task User_CanBeSavedWithValidData()
    {
        _context.Set<CoreRole>().Add(new CoreRole { Id = 1, Name = "viewer", Description = "Viewer" });
        await _context.SaveChangesAsync();

        _context.Set<CoreUser>().Add(new CoreUser
        {
            Username = "testuser",
            FullName = "Test User",
            PasswordHash = "hash1",
            RoleId = 1
        });
        await _context.SaveChangesAsync();

        var user = await _context.Set<CoreUser>().FirstAsync(u => u.Username == "testuser");
        Assert.NotNull(user);
    }

    #endregion

    #region Relationship Tests

    [Fact]
    public async Task MergeListItem_DeletingPdfFile_ShouldCascadeDelete()
    {
        var file = new PdfFile
        {
            Filename = "test.pdf", OriginalName = "test.pdf",
            FilePath = "organized/test.pdf", FileHash = "hash123"
        };
        _context.PdfFiles.Add(file);

        var list = new MergeList { Name = "Test List" };
        _context.MergeLists.Add(list);
        await _context.SaveChangesAsync();

        _context.MergeListItems.Add(new MergeListItem
        {
            MergeListId = list.Id, PdfFileId = file.Id, OrderPosition = 0
        });
        await _context.SaveChangesAsync();

        _context.PdfFiles.Remove(file);
        await _context.SaveChangesAsync();

        var items = await _context.MergeListItems.ToListAsync();
        Assert.Empty(items);
    }

    [Fact]
    public async Task MergeListItem_DeletingMergeList_ShouldCascadeDelete()
    {
        var file = new PdfFile
        {
            Filename = "test.pdf", OriginalName = "test.pdf",
            FilePath = "organized/test.pdf", FileHash = "hash456"
        };
        _context.PdfFiles.Add(file);

        var list = new MergeList { Name = "Test List" };
        _context.MergeLists.Add(list);
        await _context.SaveChangesAsync();

        _context.MergeListItems.Add(new MergeListItem
        {
            MergeListId = list.Id, PdfFileId = file.Id, OrderPosition = 0
        });
        await _context.SaveChangesAsync();

        _context.MergeLists.Remove(list);
        await _context.SaveChangesAsync();

        var items = await _context.MergeListItems.ToListAsync();
        Assert.Empty(items);

        var files = await _context.PdfFiles.ToListAsync();
        Assert.Single(files);
    }

    [Fact]
    public async Task FileCategory_RelationshipShouldWork()
    {
        var category = new Category { Name = "Test Category" };
        _context.Categories.Add(category);

        var file = new PdfFile
        {
            Filename = "test.pdf", OriginalName = "test.pdf",
            FilePath = "organized/test.pdf", FileHash = "hash789"
        };
        _context.PdfFiles.Add(file);
        await _context.SaveChangesAsync();

        _context.FileCategories.Add(new FileCategory
        {
            FileId = file.Id, CategoryId = category.Id
        });
        await _context.SaveChangesAsync();

        var fileWithCategories = await _context.PdfFiles
            .Include(f => f.FileCategories)
            .ThenInclude(fc => fc.Category)
            .FirstAsync(f => f.Id == file.Id);

        Assert.Single(fileWithCategories.FileCategories);
        Assert.Equal("Test Category", fileWithCategories.FileCategories.First().Category.Name);
    }

    #endregion

    #region Boundary Tests

    [Fact]
    public async Task PdfFile_WithVeryLongFilename_ShouldBeAccepted()
    {
        var longFilename = new string('a', 255) + ".pdf";

        _context.PdfFiles.Add(new PdfFile
        {
            Filename = longFilename, OriginalName = longFilename,
            FilePath = $"organized/{longFilename}", FileHash = "longhash"
        });

        var exception = await Record.ExceptionAsync(() => _context.SaveChangesAsync());
        Assert.Null(exception);
    }

    [Fact]
    public async Task MergeList_WithManyItems_ShouldWork()
    {
        var list = new MergeList { Name = "Large List" };
        _context.MergeLists.Add(list);
        await _context.SaveChangesAsync();

        for (int i = 0; i < 100; i++)
        {
            _context.PdfFiles.Add(new PdfFile
            {
                Filename = $"file{i}.pdf", OriginalName = $"original{i}.pdf",
                FilePath = $"organized/file{i}.pdf", FileHash = $"hash{i}"
            });
        }
        await _context.SaveChangesAsync();

        var files = await _context.PdfFiles.ToListAsync();
        foreach (var file in files)
        {
            _context.MergeListItems.Add(new MergeListItem
            {
                MergeListId = list.Id, PdfFileId = file.Id, OrderPosition = file.Id
            });
        }
        await _context.SaveChangesAsync();

        var loadedList = await _context.MergeLists
            .Include(l => l.Items)
            .FirstAsync(l => l.Id == list.Id);

        Assert.Equal(100, loadedList.Items.Count);
    }

    [Fact]
    public async Task Category_WithSpecialCharacters_ShouldWork()
    {
        var categories = new[] { "Pós Comunhão", "Espírito Santo", "Ação de Graças", "Maria (Mãe de Deus)" };

        foreach (var name in categories)
            _context.Categories.Add(new Category { Name = name });

        var exception = await Record.ExceptionAsync(() => _context.SaveChangesAsync());
        Assert.Null(exception);

        var savedCategories = await _context.Categories.ToListAsync();
        Assert.Equal(categories.Length, savedCategories.Count);
    }

    #endregion

    #region DateTime Tests

    [Fact]
    public async Task PdfFile_UploadDate_ShouldDefaultToUtcNow()
    {
        var beforeAdd = DateTime.UtcNow;

        var file = new PdfFile
        {
            Filename = "test.pdf", OriginalName = "test.pdf",
            FilePath = "organized/test.pdf", FileHash = "timetest"
        };
        _context.PdfFiles.Add(file);
        await _context.SaveChangesAsync();

        var afterAdd = DateTime.UtcNow;

        var savedFile = await _context.PdfFiles.FirstAsync(f => f.FileHash == "timetest");
        Assert.InRange(savedFile.UploadDate, beforeAdd.AddSeconds(-1), afterAdd.AddSeconds(1));
    }

    [Fact]
    public async Task MergeList_UpdatedDate_ShouldBeUpdatable()
    {
        var list = new MergeList { Name = "Time Test" };
        _context.MergeLists.Add(list);
        await _context.SaveChangesAsync();

        var originalDate = list.UpdatedDate;

        await Task.Delay(10);
        list.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        Assert.NotEqual(originalDate, list.UpdatedDate);
    }

    #endregion
}
