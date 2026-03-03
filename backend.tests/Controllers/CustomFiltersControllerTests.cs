using Core.Auth.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MusicasIgreja.Api.Controllers;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services.Interfaces;

namespace MusicasIgreja.Api.Tests.Controllers;

public class CustomFiltersControllerTests
{
    private readonly CustomFiltersController _controller;
    private readonly Mock<ICustomFilterService> _filterServiceMock;
    private readonly Mock<ICoreAuthService> _authServiceMock;

    public CustomFiltersControllerTests()
    {
        _filterServiceMock = new Mock<ICustomFilterService>();
        _authServiceMock = new Mock<ICoreAuthService>();

        _controller = new CustomFiltersController(_filterServiceMock.Object, _authServiceMock.Object);

        var httpContext = new DefaultHttpContext();
        var session = new TestSession(new Dictionary<string, byte[]>
        {
            ["UserId"] = BitConverter.GetBytes(1),
            ["RoleId"] = BitConverter.GetBytes(1),
            ["Username"] = System.Text.Encoding.UTF8.GetBytes("admin")
        });
        httpContext.Features.Set<ISessionFeature>(new TestSessionFeature { Session = session });
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        _authServiceMock.Setup(a => a.UserHasPermissionAsync(It.IsAny<int>(), It.IsAny<string>()))
            .ReturnsAsync(true);
    }

    [Fact]
    public async Task GetGroups_ShouldReturnOk()
    {
        _filterServiceMock.Setup(s => s.GetGroupsAsync(1))
            .ReturnsAsync(new List<CustomFilterGroupDto> { new() { Id = 1, Name = "Tempo" } });

        var result = await _controller.GetGroups();

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetGroup_ValidId_ShouldReturnOk()
    {
        _filterServiceMock.Setup(s => s.GetGroupByIdAsync(1))
            .ReturnsAsync(new CustomFilterGroupDto { Id = 1, Name = "Tempo" });

        var result = await _controller.GetGroup(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetGroup_InvalidId_ShouldReturnNotFound()
    {
        _filterServiceMock.Setup(s => s.GetGroupByIdAsync(999))
            .ReturnsAsync((CustomFilterGroupDto?)null);

        var result = await _controller.GetGroup(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateGroup_ValidDto_ShouldReturn201()
    {
        _filterServiceMock.Setup(s => s.CreateGroupAsync(1, It.IsAny<EntityDto>()))
            .ReturnsAsync(5);

        var result = await _controller.CreateGroup(new EntityDto { Name = "New Group" });

        var obj = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, obj.StatusCode);
    }

    [Fact]
    public async Task CreateGroup_EmptyName_ShouldReturnBadRequest()
    {
        var result = await _controller.CreateGroup(new EntityDto { Name = "" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteGroup_ValidId_ShouldReturnOk()
    {
        _filterServiceMock.Setup(s => s.DeleteGroupAsync(1)).ReturnsAsync(true);

        var result = await _controller.DeleteGroup(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteGroup_InvalidId_ShouldReturnNotFound()
    {
        _filterServiceMock.Setup(s => s.DeleteGroupAsync(999)).ReturnsAsync(false);

        var result = await _controller.DeleteGroup(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task MergeValues_Success_ShouldReturnOk()
    {
        _filterServiceMock.Setup(s => s.MergeValuesAsync(1, 2))
            .ReturnsAsync((true, "Mesclagem concluída", 3));

        var result = await _controller.MergeValues(1, 2);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task MergeValues_Failure_ShouldReturnBadRequest()
    {
        _filterServiceMock.Setup(s => s.MergeValuesAsync(1, 1))
            .ReturnsAsync((false, "Mesmo valor", 0));

        var result = await _controller.MergeValues(1, 1);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
