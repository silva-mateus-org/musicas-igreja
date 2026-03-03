using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.Models;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Tests.Services;

public class DashboardServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly DashboardService _service;

    public DashboardServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new DashboardService(_context);

        SeedData();
    }

    private void SeedData()
    {
        _context.PdfFiles.AddRange(
            new PdfFile { Id = 1, Filename = "f1.pdf", OriginalName = "f1.pdf", FilePath = "p1", FileHash = "h1", FileSize = 1024 * 1024, PageCount = 3, WorkspaceId = 1 },
            new PdfFile { Id = 2, Filename = "f2.pdf", OriginalName = "f2.pdf", FilePath = "p2", FileHash = "h2", FileSize = 2048 * 1024, PageCount = 5, YoutubeLink = "https://yt.be/x", WorkspaceId = 1 },
            new PdfFile { Id = 3, Filename = "f3.pdf", OriginalName = "f3.pdf", FilePath = "p3", FileHash = "h3", FileSize = 512, WorkspaceId = 2 }
        );

        var cat = new Category { Id = 1, Name = "Entrada", WorkspaceId = 1 };
        _context.Categories.Add(cat);

        _context.FileCategories.Add(new FileCategory { FileId = 1, CategoryId = 1 });
        _context.FileCategories.Add(new FileCategory { FileId = 2, CategoryId = 1 });

        var artist = new Artist { Id = 1, Name = "Bach" };
        _context.Artists.Add(artist);
        _context.FileArtists.Add(new FileArtist { FileId = 1, ArtistId = 1 });

        var list = new MergeList { Id = 1, Name = "Lista 1", WorkspaceId = 1 };
        _context.MergeLists.Add(list);
        _context.MergeListItems.AddRange(
            new MergeListItem { MergeListId = 1, PdfFileId = 1, OrderPosition = 0 },
            new MergeListItem { MergeListId = 1, PdfFileId = 2, OrderPosition = 1 }
        );

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetStatsAsync_ShouldReturnCorrectTotals()
    {
        var stats = await _service.GetStatsAsync(1);

        Assert.Equal(2, stats.TotalMusics);
        Assert.Equal(1, stats.TotalLists);
        Assert.Equal(1, stats.TotalCategories);
        Assert.Equal(1, stats.TotalArtists);
        Assert.Equal(1, stats.MusicsWithYoutube);
        Assert.Equal(8, stats.TotalPages);
        Assert.True(stats.TotalFileSizeMb > 0);
    }

    [Fact]
    public async Task GetStatsAsync_EmptyWorkspace_ShouldReturnZeros()
    {
        var stats = await _service.GetStatsAsync(999);

        Assert.Equal(0, stats.TotalMusics);
        Assert.Equal(0, stats.TotalLists);
        Assert.Equal(0, stats.TotalCategories);
    }

    [Fact]
    public async Task GetStatsAsync_ShouldIncludeLargestList()
    {
        var stats = await _service.GetStatsAsync(1);

        Assert.NotNull(stats.LargestList);
        Assert.Equal("Lista 1", stats.LargestList!.Name);
        Assert.Equal(2, stats.LargestList.Count);
    }

    [Fact]
    public async Task GetStatsAsync_ShouldIncludeMostPopularCategory()
    {
        var stats = await _service.GetStatsAsync(1);

        Assert.NotNull(stats.MostPopularCategory);
        Assert.Equal("Entrada", stats.MostPopularCategory!.Name);
        Assert.Equal(2, stats.MostPopularCategory.Count);
    }

    [Fact]
    public async Task GetStatsAsync_WorkspaceIsolation_ShouldNotMixData()
    {
        var ws1Stats = await _service.GetStatsAsync(1);
        var ws2Stats = await _service.GetStatsAsync(2);

        Assert.Equal(2, ws1Stats.TotalMusics);
        Assert.Equal(1, ws2Stats.TotalMusics);
    }

    [Fact]
    public async Task GetCategoriesAsync_ShouldReturnCategories()
    {
        var categories = await _service.GetCategoriesAsync(1);

        Assert.Single(categories);
        Assert.Equal("Entrada", categories[0].Label);
    }

    [Fact]
    public async Task GetArtistsAsync_ShouldReturnArtists()
    {
        var artists = await _service.GetArtistsAsync(1);

        Assert.Single(artists);
        Assert.Equal("Bach", artists[0].Label);
    }

    [Fact]
    public async Task GetCategoriesAsync_DifferentWorkspace_ShouldReturnEmpty()
    {
        var categories = await _service.GetCategoriesAsync(999);
        Assert.Empty(categories);
    }
}
