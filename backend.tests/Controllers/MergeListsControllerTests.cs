using Core.Auth.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using MusicasIgreja.Api.Controllers;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services.Interfaces;

namespace MusicasIgreja.Api.Tests.Controllers;

public class MergeListsControllerTests
{
    private readonly MergeListsController _controller;
    private readonly Mock<IListService> _listServiceMock;
    private readonly Mock<ICoreAuthService> _authServiceMock;

    public MergeListsControllerTests()
    {
        _listServiceMock = new Mock<IListService>();
        _authServiceMock = new Mock<ICoreAuthService>();

        _controller = new MergeListsController(
            _listServiceMock.Object,
            _authServiceMock.Object,
            Mock.Of<ILogger<MergeListsController>>()
        );

        var httpContext = new DefaultHttpContext();
        var testSession = new TestSession(new Dictionary<string, byte[]>
        {
            ["UserId"] = BitConverter.GetBytes(1),
            ["RoleId"] = BitConverter.GetBytes(1),
            ["Username"] = System.Text.Encoding.UTF8.GetBytes("testuser")
        });
        httpContext.Features.Set<ISessionFeature>(new TestSessionFeature { Session = testSession });
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        _authServiceMock.Setup(a => a.UserHasPermissionAsync(It.IsAny<int>(), It.IsAny<string>()))
            .ReturnsAsync(true);
    }

    #region GetLists Tests

    [Fact]
    public async Task GetLists_ShouldReturnAllLists()
    {
        var lists = new List<MergeListSummaryDto>
        {
            new(1, "Lista de Teste", "Observações", DateTime.UtcNow, DateTime.UtcNow, 2)
        };
        _listServiceMock.Setup(s => s.GetListsAsync(1, null, "updated_date", "desc"))
            .ReturnsAsync(lists);

        var result = await _controller.GetLists();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<List<MergeListSummaryDto>>(okResult.Value);
        Assert.Single(returned);
        Assert.Equal("Lista de Teste", returned[0].Name);
        Assert.Equal(2, returned[0].FileCount);
    }

    #endregion

    #region GetList Tests

    [Fact]
    public async Task GetList_WithValidId_ShouldReturnList()
    {
        _listServiceMock.Setup(s => s.GetListByIdAsync(1))
            .ReturnsAsync(new MergeListDetailDto(1, "Lista", null, DateTime.UtcNow, DateTime.UtcNow, new List<MergeListItemDto>()));

        var result = await _controller.GetList(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetList_WithInvalidId_ShouldReturnNotFound()
    {
        _listServiceMock.Setup(s => s.GetListByIdAsync(999))
            .ReturnsAsync((MergeListDetailDto?)null);

        var result = await _controller.GetList(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion

    #region CreateList Tests

    [Fact]
    public async Task CreateList_WithValidData_ShouldCreateList()
    {
        _listServiceMock.Setup(s => s.CreateListAsync(1, It.IsAny<CreateMergeListDto>()))
            .ReturnsAsync(2);

        var dto = new CreateMergeListDto { Name = "Nova Lista", Observations = "Obs", FileIds = new List<int> { 1, 2 } };

        var result = await _controller.CreateList(dto);

        var createdResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, createdResult.StatusCode);
    }

    [Fact]
    public async Task CreateList_WithEmptyName_ShouldReturnBadRequest()
    {
        var dto = new CreateMergeListDto { Name = "" };

        var result = await _controller.CreateList(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateList_WithWhitespaceName_ShouldReturnBadRequest()
    {
        var dto = new CreateMergeListDto { Name = "   " };

        var result = await _controller.CreateList(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    #endregion

    #region UpdateList Tests

    [Fact]
    public async Task UpdateList_WithValidData_ShouldUpdateList()
    {
        _listServiceMock.Setup(s => s.UpdateListAsync(1, It.IsAny<UpdateMergeListDto>()))
            .ReturnsAsync(true);

        var dto = new UpdateMergeListDto { Name = "Lista Atualizada", Observations = "Novas observações" };

        var result = await _controller.UpdateList(1, dto);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task UpdateList_WithInvalidId_ShouldReturnNotFound()
    {
        _listServiceMock.Setup(s => s.UpdateListAsync(999, It.IsAny<UpdateMergeListDto>()))
            .ReturnsAsync(false);

        var dto = new UpdateMergeListDto { Name = "Test" };

        var result = await _controller.UpdateList(999, dto);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion

    #region DeleteList Tests

    [Fact]
    public async Task DeleteList_WithValidId_ShouldDeleteList()
    {
        _listServiceMock.Setup(s => s.DeleteListAsync(1)).ReturnsAsync(true);

        var result = await _controller.DeleteList(1);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteList_WithInvalidId_ShouldReturnNotFound()
    {
        _listServiceMock.Setup(s => s.DeleteListAsync(999)).ReturnsAsync(false);

        var result = await _controller.DeleteList(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion

    #region AddItems Tests

    [Fact]
    public async Task AddItems_WithValidData_ShouldAddItems()
    {
        _listServiceMock.Setup(s => s.AddItemsAsync(1, It.IsAny<List<int>>()))
            .ReturnsAsync(new List<int> { 3 });

        var dto = new AddItemsDto { FileIds = new List<int> { 3 } };

        var result = await _controller.AddItems(1, dto);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Fact]
    public async Task AddItems_WithNullDto_ShouldReturnBadRequest()
    {
        var result = await _controller.AddItems(1, null!);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task AddItems_WithEmptyFileIds_ShouldReturnBadRequest()
    {
        var dto = new AddItemsDto { FileIds = new List<int>() };

        var result = await _controller.AddItems(1, dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task AddItems_WhenServiceThrows_ShouldPropagateException()
    {
        _listServiceMock.Setup(s => s.AddItemsAsync(1, It.IsAny<List<int>>()))
            .ThrowsAsync(new Exception("DB error"));

        var dto = new AddItemsDto { FileIds = new List<int> { 1 } };

        var ex = await Assert.ThrowsAsync<Exception>(() => _controller.AddItems(1, dto));
        Assert.Equal("DB error", ex.Message);
    }

    #endregion

    #region ReorderItems Tests

    [Fact]
    public async Task ReorderItems_ShouldUpdatePositions()
    {
        _listServiceMock.Setup(s => s.ReorderItemsAsync(1, It.IsAny<List<int>>()))
            .ReturnsAsync(true);

        var dto = new ReorderItemsDto { ItemOrder = new List<int> { 2, 1 } };

        var result = await _controller.ReorderItems(1, dto);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    #endregion

    #region DuplicateList Tests

    [Fact]
    public async Task DuplicateList_ShouldCreateCopy()
    {
        _listServiceMock.Setup(s => s.DuplicateListAsync(1, "Lista Cópia"))
            .ReturnsAsync(2);

        var dto = new CreateMergeListDto { Name = "Lista Cópia" };

        var result = await _controller.DuplicateList(1, dto);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DuplicateList_WithInvalidId_ShouldReturnNotFound()
    {
        _listServiceMock.Setup(s => s.DuplicateListAsync(999, It.IsAny<string>()))
            .ReturnsAsync(-1);

        var dto = new CreateMergeListDto { Name = "Cópia" };

        var result = await _controller.DuplicateList(999, dto);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion

    #region GenerateReport Tests

    [Fact]
    public async Task GenerateReport_WithValidId_ShouldReturnReport()
    {
        _listServiceMock.Setup(s => s.GenerateReportAsync(1))
            .ReturnsAsync("# Report\n- Song 1\n- Song 2");

        var result = await _controller.GenerateReport(1);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GenerateReport_WithInvalidId_ShouldReturnNotFound()
    {
        _listServiceMock.Setup(s => s.GenerateReportAsync(999))
            .ReturnsAsync((string?)null);

        var result = await _controller.GenerateReport(999);

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    #endregion
}
