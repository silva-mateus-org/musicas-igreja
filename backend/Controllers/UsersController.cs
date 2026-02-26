using Core.Auth.Helpers;
using Core.Auth.Services;
using Microsoft.AspNetCore.Mvc;
using MusicasIgreja.Api;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Services;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly ICoreAuthService _authService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ICoreAuthService authService, ILogger<UsersController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult> GetUsers()
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        var users = await _authService.GetAllUsersAsync();

        return Ok(new
        {
            success = true,
            users = users.Select(u => new
            {
                id = u.Id,
                username = u.Username,
                full_name = u.FullName,
                role = u.Role?.Name ?? "viewer",
                role_id = u.RoleId,
                role_display_name = u.Role?.Description ?? u.Role?.Name ?? "Visualizador",
                is_active = u.IsActive,
                must_change_password = u.MustChangePassword,
                created_at = u.CreatedAt,
                last_login = u.LastLoginDate
            })
        });
    }

    [HttpPost]
    public async Task<ActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { success = false, error = "Username e password são obrigatórios" });

        if (request.Password.Length < 4)
            return BadRequest(new { success = false, error = "Senha deve ter pelo menos 4 caracteres" });

        try
        {
            int roleId = request.RoleId ?? 1;

            if (!string.IsNullOrEmpty(request.Role))
            {
                var roles = await _authService.GetAllRolesAsync();
                var role = roles.FirstOrDefault(r => r.Name.Equals(request.Role.Trim(), StringComparison.OrdinalIgnoreCase));
                if (role != null)
                    roleId = role.Id;
            }

            var result = await _authService.CreateUserAsync(
                request.Username,
                request.FullName ?? request.Username,
                request.Password,
                roleId
            );

            if (!result.IsSuccess)
                return Conflict(new { success = false, error = result.Error });

            var userWithRole = await _authService.GetUserWithRoleAsync(result.Value!.Id);

            return StatusCode(201, new
            {
                success = true,
                user = new
                {
                    id = userWithRole!.Id,
                    username = userWithRole.Username,
                    full_name = userWithRole.FullName,
                    role = userWithRole.Role?.Name ?? "viewer",
                    role_id = userWithRole.RoleId
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { success = false, error = ex.Message });
        }
    }

    [HttpPut("{id}/role")]
    public async Task<ActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleRequest request)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        int roleId = request.RoleId ?? 1;

        if (!string.IsNullOrEmpty(request.Role))
        {
            var roles = await _authService.GetAllRolesAsync();
            var role = roles.FirstOrDefault(r => r.Name.Equals(request.Role.Trim(), StringComparison.OrdinalIgnoreCase));
            if (role != null)
                roleId = role.Id;
            else
                return BadRequest(new { success = false, error = "Role não encontrada" });
        }

        var user = await _authService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(new { success = false, error = "Usuário não encontrado" });

        var result = await _authService.UpdateUserAsync(id, user.FullName, roleId);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Role atualizada com sucesso" });
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeactivateUser(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        var currentUserId = CoreAuthHelper.GetCurrentUserId(HttpContext);
        if (currentUserId == id)
            return BadRequest(new { success = false, error = "Não é possível desativar a própria conta" });

        var result = await _authService.DeactivateUserAsync(id);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Usuário desativado com sucesso" });
    }

    [HttpDelete("{id}/permanent")]
    public async Task<ActionResult> DeleteUserPermanently(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        var currentUserId = CoreAuthHelper.GetCurrentUserId(HttpContext);
        if (currentUserId == id)
            return BadRequest(new { success = false, error = "Não é possível excluir a própria conta" });

        var result = await _authService.DeleteUserAsync(id);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Usuário excluído permanentemente" });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<ActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest request)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        if (string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { success = false, error = "Nova senha é obrigatória" });

        if (request.NewPassword.Length < 4)
            return BadRequest(new { success = false, error = "Senha deve ter pelo menos 4 caracteres" });

        var result = await _authService.ResetPasswordAsync(id, request.NewPassword);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Senha resetada com sucesso" });
    }

    [HttpPut("{id}/activate")]
    public async Task<ActionResult> ActivateUser(int id)
    {
        if (!await CoreAuthHelper.HasPermissionAsync(HttpContext, _authService, Permissions.ManageUsers))
            return StatusCode(403, new { error = "Sem permissão" });

        var result = await _authService.ActivateUserAsync(id);

        if (!result.IsSuccess)
            return NotFound(new { success = false, error = result.Error });

        return Ok(new { success = true, message = "Usuário ativado com sucesso" });
    }
}
