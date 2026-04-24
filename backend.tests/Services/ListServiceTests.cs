using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.Models;
using MusicasIgreja.Api.Services;
using MusicasIgreja.Api.Services.Interfaces;

namespace MusicasIgreja.Api.Tests.Services;

public class ListServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly ListService _service;

    public ListServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        _service = new ListService(
            _context,
            Mock.Of<IFileService>(),
            Mock.Of<IChordPdfRenderer>(),
            Mock.Of<ILogger<ListService>>()
        );

        SeedData();
    }

    private void SeedData()
    {
        var ws = new Workspace { Id = 1, Name = "Igreja", Slug = "igreja" };
        _context.Workspaces.Add(ws);

        _context.PdfFiles.AddRange(
            new PdfFile { Id = 1, Filename = "Ave Maria.pdf", OriginalName = "ave.pdf", SongName = "Ave Maria", FilePath = "p1", FileHash = "h1", WorkspaceId = 1 },
            new PdfFile { Id = 2, Filename = "Aleluia.pdf", OriginalName = "aleluia.pdf", SongName = "Aleluia", FilePath = "p2", FileHash = "h2", WorkspaceId = 1 },
            new PdfFile { Id = 3, Filename = "Other.pdf", OriginalName = "other.pdf", SongName = "Other", FilePath = "p3", FileHash = "h3", WorkspaceId = 2 }
        );

        var list = new MergeList { Id = 1, Name = "Domingo", WorkspaceId = 1 };
        _context.MergeLists.Add(list);
        _context.SaveChanges();

        _context.MergeListItems.Add(new MergeListItem { Id = 1, MergeListId = 1, PdfFileId = 1, OrderPosition = 0 });
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region AddItemsAsync

    [Fact]
    public async Task AddItemsAsync_WithValidFileIds_ShouldReturnNonZeroIds()
    {
        var result = await _service.AddItemsAsync(1, new List<int> { 2 });

        Assert.Single(result);
        Assert.All(result, id => Assert.True(id > 0));
    }

    [Fact]
    public async Task AddItemsAsync_ShouldPersistItemsToDatabase()
    {
        await _service.AddItemsAsync(1, new List<int> { 2 });

        var items = await _context.MergeListItems.Where(i => i.MergeListId == 1).ToListAsync();
        Assert.Equal(2, items.Count);
        Assert.Contains(items, i => i.PdfFileId == 2);
    }

    [Fact]
    public async Task AddItemsAsync_ShouldAssignIncrementingOrderPositions()
    {
        await _service.AddItemsAsync(1, new List<int> { 2 });

        var newItem = await _context.MergeListItems.FirstAsync(i => i.PdfFileId == 2);
        Assert.Equal(1, newItem.OrderPosition);
    }

    [Fact]
    public async Task AddItemsAsync_WithNonExistentList_ShouldReturnEmptyList()
    {
        var result = await _service.AddItemsAsync(999, new List<int> { 1 });

        Assert.Empty(result);
    }

    [Fact]
    public async Task AddItemsAsync_WithInvalidFileIds_ShouldReturnEmptyList()
    {
        var result = await _service.AddItemsAsync(1, new List<int> { 999, 998 });

        Assert.Empty(result);
    }

    [Fact]
    public async Task AddItemsAsync_WithFileFromDifferentWorkspace_ShouldNotAddItem()
    {
        var result = await _service.AddItemsAsync(1, new List<int> { 3 });

        Assert.Empty(result);
        var items = await _context.MergeListItems.Where(i => i.MergeListId == 1).ToListAsync();
        Assert.Single(items);
    }

    [Fact]
    public async Task AddItemsAsync_ShouldUpdateListTimestamp()
    {
        var beforeUpdate = (await _context.MergeLists.FindAsync(1))!.UpdatedDate;
        await Task.Delay(10);

        await _service.AddItemsAsync(1, new List<int> { 2 });

        var afterUpdate = (await _context.MergeLists.FindAsync(1))!.UpdatedDate;
        Assert.True(afterUpdate > beforeUpdate);
    }

    #endregion

    #region ReorderItemsAsync

    [Fact]
    public async Task ReorderItemsAsync_WithValidOrder_ShouldUpdatePositions()
    {
        _context.MergeListItems.Add(new MergeListItem { Id = 2, MergeListId = 1, PdfFileId = 2, OrderPosition = 1 });
        await _context.SaveChangesAsync();

        var result = await _service.ReorderItemsAsync(1, new List<int> { 2, 1 });

        Assert.True(result);
        var item1 = await _context.MergeListItems.FindAsync(1);
        var item2 = await _context.MergeListItems.FindAsync(2);
        Assert.Equal(1, item1!.OrderPosition);
        Assert.Equal(0, item2!.OrderPosition);
    }

    [Fact]
    public async Task ReorderItemsAsync_WithNonExistentList_ShouldReturnFalse()
    {
        var result = await _service.ReorderItemsAsync(999, new List<int> { 1 });

        Assert.False(result);
    }

    #endregion
}
