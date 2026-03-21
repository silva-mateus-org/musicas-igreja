using Core.Auth.Helpers;
using Core.Auth.Services;
using Microsoft.AspNetCore.Mvc;
using MusicasIgreja.Api;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/monitoring")]
public class MonitoringController : ControllerBase
{
    private readonly IMonitoringService _monitoringService;
    private readonly ICoreAuthService _authService;

    public MonitoringController(IMonitoringService monitoringService, ICoreAuthService authService)
    {
        _monitoringService = monitoringService;
        _authService = authService;
    }

    [HttpGet("alerts")]
    public async Task<ActionResult> GetAlerts()
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var userId = CoreAuthHelper.GetCurrentUserId(HttpContext);
        var alerts = await _monitoringService.GetUnreadAlertsAsync(userId);

        return Ok(new
        {
            success = true,
            data = alerts.Select(a => new
            {
                id = a.Id,
                event_type = a.EventType,
                severity = a.Severity,
                source = a.Source,
                message = a.Message,
                user_id = a.UserId,
                ip_address = a.IpAddress,
                user_agent = a.UserAgent,
                metadata = a.Metadata,
                is_read = a.IsRead,
                created_date = a.CreatedDate,
                username = a.User?.Username
            }),
            count = alerts.Count
        });
    }

    [HttpGet("alerts/count")]
    public async Task<ActionResult> GetAlertCount()
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var count = await _monitoringService.GetUnreadAlertCountAsync();
        return Ok(new { count });
    }

    [HttpPost("alerts/{id}/read")]
    public async Task<ActionResult> MarkAlertAsRead(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        await _monitoringService.MarkAlertAsReadAsync(id);
        return Ok(new { success = true });
    }

    [HttpGet("events")]
    public async Task<ActionResult> GetEvents(
        [FromQuery] string? event_type = null,
        [FromQuery] string? severity = null,
        [FromQuery] int? user_id = null,
        [FromQuery] string? start_date = null,
        [FromQuery] string? end_date = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        DateTime? startDate = null;
        DateTime? endDate = null;

        if (!string.IsNullOrEmpty(start_date) && DateTime.TryParse(start_date, out var sd))
            startDate = sd;

        if (!string.IsNullOrEmpty(end_date) && DateTime.TryParse(end_date, out var ed))
            endDate = ed;

        var (events, total) = await _monitoringService.GetRecentEventsAsync(
            event_type, severity, user_id, startDate, endDate, page, limit);

        return Ok(new
        {
            success = true,
            data = events.Select(e => new
            {
                id = e.Id,
                event_type = e.EventType,
                severity = e.Severity,
                source = e.Source,
                message = e.Message,
                user_id = e.UserId,
                ip_address = e.IpAddress,
                user_agent = e.UserAgent,
                metadata = e.Metadata,
                is_read = e.IsRead,
                created_date = e.CreatedDate,
                username = e.User?.Username
            }),
            pagination = new
            {
                page,
                limit,
                total,
                pages = (int)Math.Ceiling(total / (double)limit)
            }
        });
    }

    [HttpGet("audit")]
    public async Task<ActionResult> GetAuditLogs(
        [FromQuery] string? action = null,
        [FromQuery] string? entity_type = null,
        [FromQuery] int? user_id = null,
        [FromQuery] string? start_date = null,
        [FromQuery] string? end_date = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 50)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        DateTime? startDate = null;
        DateTime? endDate = null;

        if (!string.IsNullOrEmpty(start_date) && DateTime.TryParse(start_date, out var sd))
            startDate = sd;

        if (!string.IsNullOrEmpty(end_date) && DateTime.TryParse(end_date, out var ed))
            endDate = ed;

        var (logs, total) = await _monitoringService.GetAuditLogsAsync(
            action, entity_type, user_id, startDate, endDate, page, limit);

        return Ok(new
        {
            success = true,
            data = logs.Select(l => new
            {
                id = l.Id,
                action = l.Action,
                entity_type = l.EntityType,
                entity_id = l.EntityId,
                user_id = l.UserId,
                username = l.Username,
                ip_address = l.IpAddress,
                old_value = l.OldValue,
                new_value = l.NewValue,
                created_date = l.CreatedDate
            }),
            pagination = new
            {
                page,
                limit,
                total,
                pages = (int)Math.Ceiling(total / (double)limit)
            }
        });
    }

    [HttpGet("metrics")]
    public async Task<ActionResult> GetMetrics(
        [FromQuery] string? metric_type = null,
        [FromQuery] string? start_date = null,
        [FromQuery] string? end_date = null,
        [FromQuery] int limit = 100)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        DateTime? startDate = null;
        DateTime? endDate = null;

        if (!string.IsNullOrEmpty(start_date) && DateTime.TryParse(start_date, out var sd))
            startDate = sd;

        if (!string.IsNullOrEmpty(end_date) && DateTime.TryParse(end_date, out var ed))
            endDate = ed;

        var metrics = await _monitoringService.GetMetricsAsync(metric_type, startDate, endDate, limit);

        return Ok(new
        {
            success = true,
            data = metrics.Select(m => new
            {
                id = m.Id,
                metric_type = m.MetricType,
                value = m.Value,
                unit = m.Unit,
                metadata = m.Metadata,
                timestamp = m.Timestamp
            })
        });
    }

    [HttpGet("health-extended")]
    public async Task<ActionResult> GetHealthExtended()
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var health = await _monitoringService.GetSystemHealthAsync();
        return Ok(new { success = true, data = health });
    }
}
