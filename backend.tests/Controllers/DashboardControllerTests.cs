using Microsoft.AspNetCore.Mvc;
using Moq;
using MusicasIgreja.Api.Controllers;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services.Interfaces;

namespace MusicasIgreja.Api.Tests.Controllers;

public class DashboardControllerTests
{
    private readonly DashboardController _controller;
    private readonly Mock<IDashboardService> _dashboardServiceMock;

    public DashboardControllerTests()
    {
        _dashboardServiceMock = new Mock<IDashboardService>();
        _controller = new DashboardController(_dashboardServiceMock.Object);
    }

    [Fact]
    public async Task GetStats_ShouldReturnStats()
    {
        _dashboardServiceMock.Setup(s => s.GetStatsAsync(1))
            .ReturnsAsync(new DashboardStatsDto { TotalMusics = 10, TotalLists = 3 });

        var result = await _controller.GetStats();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStatsDto>(okResult.Value);
        Assert.Equal(10, stats.TotalMusics);
    }

    [Fact]
    public async Task GetCategories_ShouldReturnCategories()
    {
        _dashboardServiceMock.Setup(s => s.GetCategoriesAsync(1))
            .ReturnsAsync(new List<FilterOptionDto> { new("slug", "Entrada") });

        var result = await _controller.GetCategories();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetArtists_ShouldReturnArtists()
    {
        _dashboardServiceMock.Setup(s => s.GetArtistsAsync(1))
            .ReturnsAsync(new List<FilterOptionDto> { new("bach", "Bach") });

        var result = await _controller.GetArtists();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetTopSongsByCategory_EmptyCategory_ShouldReturnBadRequest()
    {
        var result = await _controller.GetTopSongsByCategory(category: "");

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetTopSongsByCategory_ValidCategory_ShouldReturnOk()
    {
        _dashboardServiceMock.Setup(s => s.GetTopSongsByCategoryAsync(1, "entrada"))
            .ReturnsAsync(new { songs = Array.Empty<object>() });

        var result = await _controller.GetTopSongsByCategory(category: "entrada");

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetUploadsTimeline_ShouldReturnOk()
    {
        _dashboardServiceMock.Setup(s => s.GetUploadsTimelineAsync(1, 12))
            .ReturnsAsync(new { timeline = Array.Empty<object>() });

        var result = await _controller.GetUploadsTimeline();

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetTopArtists_ShouldReturnOk()
    {
        _dashboardServiceMock.Setup(s => s.GetTopArtistsAsync(1, 10))
            .ReturnsAsync(new { artists = Array.Empty<object>() });

        var result = await _controller.GetTopArtists();

        Assert.IsType<OkObjectResult>(result.Result);
    }
}
