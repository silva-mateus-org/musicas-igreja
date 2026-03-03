using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Models;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Tests.Services;

public class CustomFilterServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly CustomFilterService _service;

    public CustomFilterServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);
        _service = new CustomFilterService(_context, Mock.Of<ILogger<CustomFilterService>>());

        SeedData();
    }

    private void SeedData()
    {
        var group = new CustomFilterGroup { Id = 1, Name = "Tempo Litúrgico", WorkspaceId = 1, SortOrder = 0 };
        _context.CustomFilterGroups.Add(group);
        _context.SaveChanges();

        _context.CustomFilterValues.AddRange(
            new CustomFilterValue { Id = 1, FilterGroupId = 1, Name = "Advento", SortOrder = 0 },
            new CustomFilterValue { Id = 2, FilterGroupId = 1, Name = "Quaresma", SortOrder = 1 }
        );
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region Group Tests

    [Fact]
    public async Task GetGroupsAsync_ShouldReturnGroupsForWorkspace()
    {
        var groups = await _service.GetGroupsAsync(1);

        Assert.Single(groups);
        Assert.Equal("Tempo Litúrgico", groups[0].Name);
        Assert.Equal(2, groups[0].Values.Count);
    }

    [Fact]
    public async Task GetGroupsAsync_DifferentWorkspace_ShouldReturnEmpty()
    {
        var groups = await _service.GetGroupsAsync(999);
        Assert.Empty(groups);
    }

    [Fact]
    public async Task GetGroupByIdAsync_ExistingGroup_ShouldReturn()
    {
        var group = await _service.GetGroupByIdAsync(1);

        Assert.NotNull(group);
        Assert.Equal("Tempo Litúrgico", group!.Name);
    }

    [Fact]
    public async Task GetGroupByIdAsync_NonexistentGroup_ShouldReturnNull()
    {
        var group = await _service.GetGroupByIdAsync(999);
        Assert.Null(group);
    }

    [Fact]
    public async Task CreateGroupAsync_ShouldCreate()
    {
        var id = await _service.CreateGroupAsync(1, new EntityDto { Name = "Ritmo" });

        var group = await _context.CustomFilterGroups.FindAsync(id);
        Assert.NotNull(group);
        Assert.Equal("Ritmo", group!.Name);
        Assert.Equal(1, group.SortOrder);
    }

    [Fact]
    public async Task CreateGroupAsync_DuplicateName_ShouldThrow()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateGroupAsync(1, new EntityDto { Name = "Tempo Litúrgico" }));
    }

    [Fact]
    public async Task UpdateGroupAsync_ShouldUpdateName()
    {
        var success = await _service.UpdateGroupAsync(1, new EntityDto { Name = "Updated" });

        Assert.True(success);
        var group = await _context.CustomFilterGroups.FindAsync(1);
        Assert.Equal("Updated", group!.Name);
    }

    [Fact]
    public async Task UpdateGroupAsync_NonexistentGroup_ShouldReturnFalse()
    {
        var success = await _service.UpdateGroupAsync(999, new EntityDto { Name = "Test" });
        Assert.False(success);
    }

    [Fact]
    public async Task DeleteGroupAsync_ShouldDelete()
    {
        var success = await _service.DeleteGroupAsync(1);

        Assert.True(success);
        Assert.Null(await _context.CustomFilterGroups.FindAsync(1));
    }

    [Fact]
    public async Task DeleteGroupAsync_NonexistentGroup_ShouldReturnFalse()
    {
        var success = await _service.DeleteGroupAsync(999);
        Assert.False(success);
    }

    [Fact]
    public async Task ToggleShowAsTabAsync_ShouldToggle()
    {
        Assert.True(await _service.ToggleShowAsTabAsync(1, true));

        var group = await _context.CustomFilterGroups.FindAsync(1);
        Assert.True(group!.ShowAsTab);
    }

    #endregion

    #region Value Tests

    [Fact]
    public async Task CreateValueAsync_ShouldCreate()
    {
        var id = await _service.CreateValueAsync(1, new EntityDto { Name = "Natal" });

        var value = await _context.CustomFilterValues.FindAsync(id);
        Assert.NotNull(value);
        Assert.Equal("Natal", value!.Name);
    }

    [Fact]
    public async Task CreateValueAsync_DuplicateName_ShouldThrow()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateValueAsync(1, new EntityDto { Name = "Advento" }));
    }

    [Fact]
    public async Task UpdateValueAsync_ShouldUpdateName()
    {
        Assert.True(await _service.UpdateValueAsync(1, new EntityDto { Name = "Advento Renovado" }));

        var value = await _context.CustomFilterValues.FindAsync(1);
        Assert.Equal("Advento Renovado", value!.Name);
    }

    [Fact]
    public async Task DeleteValueAsync_ShouldDelete()
    {
        Assert.True(await _service.DeleteValueAsync(2));
        Assert.Null(await _context.CustomFilterValues.FindAsync(2));
    }

    [Fact]
    public async Task GetValuesWithDetailsAsync_ShouldReturnValues()
    {
        var values = await _service.GetValuesWithDetailsAsync(1);

        Assert.Equal(2, values.Count);
        Assert.Equal("Advento", values[0].Name);
    }

    #endregion

    #region Merge Tests

    [Fact]
    public async Task MergeValuesAsync_SameValue_ShouldFail()
    {
        var (success, _, _) = await _service.MergeValuesAsync(1, 1);
        Assert.False(success);
    }

    [Fact]
    public async Task MergeValuesAsync_ValidMerge_ShouldMoveAssociationsAndDeleteSource()
    {
        var file = new PdfFile { Filename = "test.pdf", OriginalName = "test.pdf", FilePath = "test.pdf", FileHash = "h1" };
        _context.PdfFiles.Add(file);
        await _context.SaveChangesAsync();

        _context.FileCustomFilters.Add(new FileCustomFilter { FileId = file.Id, FilterValueId = 1 });
        await _context.SaveChangesAsync();

        var (success, _, mergedCount) = await _service.MergeValuesAsync(1, 2);

        Assert.True(success);
        Assert.Equal(1, mergedCount);
        Assert.Null(await _context.CustomFilterValues.FindAsync(1));

        var assoc = await _context.FileCustomFilters.FirstAsync(f => f.FileId == file.Id);
        Assert.Equal(2, assoc.FilterValueId);
    }

    [Fact]
    public async Task MergeValuesAsync_NonexistentSource_ShouldFail()
    {
        var (success, _, _) = await _service.MergeValuesAsync(999, 2);
        Assert.False(success);
    }

    #endregion
}
