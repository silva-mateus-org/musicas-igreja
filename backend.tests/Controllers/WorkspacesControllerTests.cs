using Core.Auth.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MusicasIgreja.Api.Controllers;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services.Interfaces;

namespace MusicasIgreja.Api.Tests.Controllers;

public class WorkspacesControllerTests
{
    private readonly WorkspacesController _controller;
    private readonly Mock<IWorkspaceService> _workspaceServiceMock;
    private readonly Mock<ICoreAuthService> _authServiceMock;

    public WorkspacesControllerTests()
    {
        _workspaceServiceMock = new Mock<IWorkspaceService>();
        _authServiceMock = new Mock<ICoreAuthService>();

        _controller = new WorkspacesController(_workspaceServiceMock.Object, _authServiceMock.Object);

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
    public async Task GetWorkspaces_ShouldReturnOk()
    {
        _workspaceServiceMock.Setup(s => s.GetAllAsync())
            .ReturnsAsync(new List<WorkspaceDto> { new() { Id = 1, Name = "Default" } });

        var result = await _controller.GetWorkspaces();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var workspaces = Assert.IsType<List<WorkspaceDto>>(okResult.Value);
        Assert.Single(workspaces);
    }

    [Fact]
    public async Task GetWorkspace_ValidId_ShouldReturnOk()
    {
        _workspaceServiceMock.Setup(s => s.GetByIdAsync(1))
            .ReturnsAsync(new WorkspaceDto { Id = 1, Name = "Default" });

        var result = await _controller.GetWorkspace(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetWorkspace_InvalidId_ShouldReturnNotFound()
    {
        _workspaceServiceMock.Setup(s => s.GetByIdAsync(999))
            .ReturnsAsync((WorkspaceDto?)null);

        var result = await _controller.GetWorkspace(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateWorkspace_ValidDto_ShouldReturn201()
    {
        _workspaceServiceMock.Setup(s => s.CreateAsync(It.IsAny<CreateWorkspaceDto>()))
            .ReturnsAsync(new WorkspaceDto { Id = 2, Name = "New" });

        var result = await _controller.CreateWorkspace(new CreateWorkspaceDto { Name = "New" });

        var obj = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, obj.StatusCode);
    }

    [Fact]
    public async Task CreateWorkspace_EmptyName_ShouldReturnBadRequest()
    {
        var result = await _controller.CreateWorkspace(new CreateWorkspaceDto { Name = "" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateWorkspace_ValidData_ShouldReturnOk()
    {
        _workspaceServiceMock.Setup(s => s.UpdateAsync(1, It.IsAny<UpdateWorkspaceDto>()))
            .ReturnsAsync(true);

        var result = await _controller.UpdateWorkspace(1, new UpdateWorkspaceDto { Name = "Updated" });

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateWorkspace_InvalidId_ShouldReturnNotFound()
    {
        _workspaceServiceMock.Setup(s => s.UpdateAsync(999, It.IsAny<UpdateWorkspaceDto>()))
            .ReturnsAsync(false);

        var result = await _controller.UpdateWorkspace(999, new UpdateWorkspaceDto { Name = "Test" });

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteWorkspace_ValidId_ShouldReturnOk()
    {
        _workspaceServiceMock.Setup(s => s.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _controller.DeleteWorkspace(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteWorkspace_InvalidId_ShouldReturnBadRequest()
    {
        _workspaceServiceMock.Setup(s => s.DeleteAsync(999)).ReturnsAsync(false);

        var result = await _controller.DeleteWorkspace(999);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
