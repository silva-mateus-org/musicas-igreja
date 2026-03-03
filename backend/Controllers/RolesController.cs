using Core.Auth.Helpers;
using Core.Auth.Models;
using Core.Auth.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICoreAuthService _authService;
    private readonly ILogger<RolesController> _logger;

    public RolesController(AppDbContext context, ICoreAuthService authService, ILogger<RolesController> logger)
    {
        _context = context;
        _authService = authService;
        _logger = logger;
    }

    private static List<string> PermissionsFromRequest(PermissionsRequest? p)
    {
        var list = new List<string>();
        if (p == null) return list;
        if (p.CanViewMusic == true) list.Add(Permissions.ViewMusic);
        if (p.CanDownloadMusic == true) list.Add(Permissions.DownloadMusic);
        if (p.CanEditMusicMetadata == true) list.Add(Permissions.EditMetadata);
        if (p.CanUploadMusic == true) list.Add(Permissions.UploadMusic);
        if (p.CanDeleteMusic == true) list.Add(Permissions.DeleteMusic);
        if (p.CanManageLists == true) list.Add(Permissions.ManageLists);
        if (p.CanManageCategories == true) list.Add(Permissions.ManageCategories);
        if (p.CanManageUsers == true) list.Add(Permissions.ManageUsers);
        if (p.CanManageRoles == true) list.Add(Permissions.ManageRoles);
        if (p.CanAccessAdmin == true) list.Add(Permissions.AccessAdmin);
        return list;
    }

    private static object PermissionsToResponse(ICollection<RolePermission>? permissions)
    {
        var keys = permissions?.Select(x => x.PermissionKey).ToHashSet() ?? new HashSet<string>();
        return new
        {
            can_view_music = keys.Contains(Permissions.ViewMusic),
            can_download_music = keys.Contains(Permissions.DownloadMusic),
            can_edit_music_metadata = keys.Contains(Permissions.EditMetadata),
            can_upload_music = keys.Contains(Permissions.UploadMusic),
            can_delete_music = keys.Contains(Permissions.DeleteMusic),
            can_manage_lists = keys.Contains(Permissions.ManageLists),
            can_manage_categories = keys.Contains(Permissions.ManageCategories),
            can_manage_users = keys.Contains(Permissions.ManageUsers),
            can_manage_roles = keys.Contains(Permissions.ManageRoles),
            can_access_admin = keys.Contains(Permissions.AccessAdmin)
        };
    }

    [HttpGet]
    public async Task<ActionResult> GetRoles()
    {
        var roles = await _authService.GetAllRolesAsync();
        var userCountByRole = await _context.Set<CoreUser>()
            .GroupBy(u => u.RoleId)
            .ToDictionaryAsync(g => g.Key, g => g.Count());

        return Ok(new
        {
            success = true,
            roles = roles.Select(r => new
            {
                id = r.Id,
                name = r.Name,
                display_name = r.Description ?? r.Name,
                description = r.Description,
                is_system_role = false,
                is_default = r.IsDefault,
                priority = 0,
                user_count = userCountByRole.GetValueOrDefault(r.Id, 0),
                permissions = PermissionsToResponse(r.Permissions)
            })
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetRole(int id)
    {
        var role = await _authService.GetRoleByIdAsync(id);
        
        if (role == null)
            return NotFound(new { success = false, error = "Role não encontrada" });

        return Ok(new
        {
            success = true,
            role = new
            {
                id = role.Id,
                name = role.Name,
                display_name = role.Description ?? role.Name,
                description = role.Description,
                is_system_role = false,
                is_default = role.IsDefault,
                priority = 0,
                permissions = PermissionsToResponse(role.Permissions)
            }
        });
    }

    [HttpPost("{id}/set-default")]
    public async Task<ActionResult> SetDefaultRole(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageRoles))
            return StatusCode(403, new { error = "Sem permissão" });

        var result = await _authService.SetDefaultRoleAsync(id);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Role definida como padrão" });
    }

    [HttpPost]
    public async Task<ActionResult> CreateRole([FromBody] RoleRequest request)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageRoles))
            return StatusCode(403, new { error = "Sem permissão" });

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { success = false, error = "Nome e nome de exibição são obrigatórios" });

        var name = request.Name.ToLower().Replace(" ", "_");
        var permKeys = PermissionsFromRequest(request.Permissions);
        if (permKeys.Count == 0)
            permKeys = [Permissions.ViewMusic, Permissions.DownloadMusic];

        var result = await _authService.CreateRoleAsync(name, request.Description ?? request.DisplayName, permKeys);

        if (!result.IsSuccess)
            return Conflict(new { success = false, error = result.Error });

        return StatusCode(201, new { success = true, role = new { id = result.Value!.Id, name = result.Value.Name } });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateRole(int id, [FromBody] RoleRequest request)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageRoles))
            return StatusCode(403, new { error = "Sem permissão" });

        var existingRole = await _authService.GetRoleByIdAsync(id);
        if (existingRole == null)
            return NotFound(new { success = false, error = "Role não encontrada" });

        var name = request.Name?.ToLower().Replace(" ", "_") ?? existingRole.Name;
        var description = request.Description ?? request.DisplayName ?? existingRole.Description;
        var permKeys = request.Permissions != null ? PermissionsFromRequest(request.Permissions) : existingRole.Permissions.Select(p => p.PermissionKey).ToList();

        var result = await _authService.UpdateRoleAsync(id, name, description, permKeys);

        if (!result.IsSuccess)
            return BadRequest(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Role atualizada com sucesso" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteRole(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageRoles))
            return StatusCode(403, new { error = "Sem permissão" });

        var result = await _authService.DeleteRoleAsync(id);

        if (!result.IsSuccess)
            return result.ErrorCode == "ROLE_HAS_USERS"
                ? BadRequest(new { success = false, error = result.Error })
                : NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Role excluída com sucesso" });
    }
}
