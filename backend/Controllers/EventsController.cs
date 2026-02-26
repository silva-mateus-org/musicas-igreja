using Core.Auth.Helpers;
using Core.Auth.Services;
using Core.Infrastructure.Events;
using Microsoft.AspNetCore.Mvc;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly ISseService _sseService;
    private readonly ICoreAuthService _authService;
    private readonly IMonitoringService _monitoringService;

    public EventsController(ISseService sseService, ICoreAuthService authService, IMonitoringService monitoringService)
    {
        _sseService = sseService;
        _authService = authService;
        _monitoringService = monitoringService;
    }

    [HttpGet("stream")]
    public async Task Stream(CancellationToken cancellationToken)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
        {
            HttpContext.Response.StatusCode = 403;
            return;
        }

        var userId = CoreAuthHelper.GetCurrentUserId(HttpContext) ?? 0;
        var clientId = $"{userId}_{Guid.NewGuid().ToString("N")[..8]}";

        var alertCount = await _monitoringService.GetUnreadAlertCountAsync();
        var recentAlerts = alertCount > 0
            ? (await _monitoringService.GetUnreadAlertsAsync()).Take(5).Select(a => new
            {
                id = a.Id,
                event_type = a.EventType,
                severity = a.Severity,
                message = a.Message,
                created_date = a.CreatedDate
            }).ToList()
            : [];

        var initialEvents = new[]
        {
            new SseEvent("alert-count", new { count = alertCount }),
            new SseEvent("recent-alerts", new { alerts = recentAlerts })
        };

        await _sseService.AddClientAsync(clientId, Response, cancellationToken, initialEvents);
    }
}
