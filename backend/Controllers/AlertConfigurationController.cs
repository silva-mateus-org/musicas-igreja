using Core.Auth.Helpers;
using Core.Auth.Services;
using Microsoft.AspNetCore.Mvc;
using MusicasIgreja.Api;
using MusicasIgreja.Api.Models;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/alert_configurations")]
public class AlertConfigurationController : ControllerBase
{
    private readonly IAlertConfigurationService _alertConfigService;
    private readonly ICoreAuthService _authService;

    public AlertConfigurationController(IAlertConfigurationService alertConfigService, ICoreAuthService authService)
    {
        _alertConfigService = alertConfigService;
        _authService = authService;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var configs = await _alertConfigService.GetAllConfigurationsAsync();
        return Ok(new
        {
            success = true,
            data = configs.Select(c => new
            {
                id = c.Id,
                config_key = c.ConfigKey,
                name = c.Name,
                description = c.Description,
                metric_type = c.MetricType,
                threshold_value = c.ThresholdValue,
                threshold_unit = c.ThresholdUnit,
                comparison_operator = c.ComparisonOperator,
                severity = c.Severity,
                is_enabled = c.IsEnabled,
                created_date = c.CreatedDate,
                updated_date = c.UpdatedDate
            })
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var config = await _alertConfigService.GetConfigurationByIdAsync(id);
        if (config == null)
            return NotFound(new { error = "Configuração não encontrada" });

        return Ok(new
        {
            success = true,
            data = new
            {
                id = config.Id,
                config_key = config.ConfigKey,
                name = config.Name,
                description = config.Description,
                metric_type = config.MetricType,
                threshold_value = config.ThresholdValue,
                threshold_unit = config.ThresholdUnit,
                comparison_operator = config.ComparisonOperator,
                severity = config.Severity,
                is_enabled = config.IsEnabled,
                created_date = config.CreatedDate,
                updated_date = config.UpdatedDate
            }
        });
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] AlertConfigurationDto dto)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var config = new AlertConfiguration
        {
            ConfigKey = dto.ConfigKey,
            Name = dto.Name,
            Description = dto.Description,
            MetricType = dto.MetricType,
            ThresholdValue = dto.ThresholdValue,
            ThresholdUnit = dto.ThresholdUnit,
            ComparisonOperator = dto.ComparisonOperator,
            Severity = dto.Severity,
            IsEnabled = dto.IsEnabled
        };

        var created = await _alertConfigService.CreateConfigurationAsync(config);

        return StatusCode(201, new
        {
            success = true,
            data = new
            {
                id = created.Id,
                config_key = created.ConfigKey,
                name = created.Name
            }
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] AlertConfigurationDto dto)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        var config = new AlertConfiguration
        {
            Name = dto.Name,
            Description = dto.Description,
            ThresholdValue = dto.ThresholdValue,
            ThresholdUnit = dto.ThresholdUnit,
            ComparisonOperator = dto.ComparisonOperator,
            Severity = dto.Severity,
            IsEnabled = dto.IsEnabled
        };

        var updated = await _alertConfigService.UpdateConfigurationAsync(id, config);

        return Ok(new
        {
            success = true,
            data = new
            {
                id = updated.Id,
                config_key = updated.ConfigKey,
                name = updated.Name
            }
        });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.AccessAdmin))
            return StatusCode(403, new { error = "Sem permissão" });

        await _alertConfigService.DeleteConfigurationAsync(id);
        return Ok(new { success = true });
    }
}

// DTO for creating/updating alert configurations
public class AlertConfigurationDto
{
    public string ConfigKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string MetricType { get; set; } = string.Empty;
    public double ThresholdValue { get; set; }
    public string ThresholdUnit { get; set; } = string.Empty;
    public string ComparisonOperator { get; set; } = "greater_than";
    public string Severity { get; set; } = "medium";
    public bool IsEnabled { get; set; } = true;
}
