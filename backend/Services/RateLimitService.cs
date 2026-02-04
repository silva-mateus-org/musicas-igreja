using System.Collections.Concurrent;

namespace MusicasIgreja.Api.Services;

public interface IRateLimitService
{
    bool IsRateLimited(string key);
    void RecordAttempt(string key);
    void ResetAttempts(string key);
}

public class RateLimitService : IRateLimitService
{
    private readonly ConcurrentDictionary<string, LoginAttempt> _attempts = new();
    private readonly ILogger<RateLimitService> _logger;
    
    // Configurações
    private const int MaxAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);
    
    private class LoginAttempt
    {
        public int Count { get; set; }
        public DateTime FirstAttempt { get; set; }
        public DateTime? LockedUntil { get; set; }
    }

    public RateLimitService(ILogger<RateLimitService> logger)
    {
        _logger = logger;
        // Iniciar limpeza periódica de tentativas antigas
        Task.Run(CleanupOldAttempts);
    }

    public bool IsRateLimited(string key)
    {
        if (!_attempts.TryGetValue(key, out var attempt))
            return false;

        // Se está bloqueado, verificar se o tempo já passou
        if (attempt.LockedUntil.HasValue)
        {
            if (DateTime.UtcNow < attempt.LockedUntil.Value)
            {
                _logger.LogWarning("Rate limit active for {Key}, locked until {LockedUntil}", 
                    key, attempt.LockedUntil.Value);
                return true;
            }
            
            // Tempo de bloqueio expirou, resetar
            _attempts.TryRemove(key, out _);
            return false;
        }

        // Se passou mais de 15 minutos desde a primeira tentativa, resetar contador
        if (DateTime.UtcNow - attempt.FirstAttempt > LockoutDuration)
        {
            _attempts.TryRemove(key, out _);
            return false;
        }

        return false;
    }

    public void RecordAttempt(string key)
    {
        var attempt = _attempts.AddOrUpdate(
            key,
            k => new LoginAttempt
            {
                Count = 1,
                FirstAttempt = DateTime.UtcNow
            },
            (k, existing) =>
            {
                // Se passou o tempo de reset, começar de novo
                if (DateTime.UtcNow - existing.FirstAttempt > LockoutDuration)
                {
                    return new LoginAttempt
                    {
                        Count = 1,
                        FirstAttempt = DateTime.UtcNow
                    };
                }

                existing.Count++;
                
                // Se atingiu o limite, bloquear
                if (existing.Count >= MaxAttempts)
                {
                    existing.LockedUntil = DateTime.UtcNow.Add(LockoutDuration);
                    _logger.LogWarning(
                        "Rate limit triggered for {Key} after {Count} attempts. Locked until {LockedUntil}",
                        key, existing.Count, existing.LockedUntil.Value);
                }
                
                return existing;
            });

        _logger.LogInformation("Login attempt recorded for {Key}: {Count}/{MaxAttempts}", 
            key, attempt.Count, MaxAttempts);
    }

    public void ResetAttempts(string key)
    {
        if (_attempts.TryRemove(key, out _))
        {
            _logger.LogInformation("Login attempts reset for {Key}", key);
        }
    }

    private async Task CleanupOldAttempts()
    {
        while (true)
        {
            try
            {
                await Task.Delay(CleanupInterval);
                
                var now = DateTime.UtcNow;
                var toRemove = _attempts
                    .Where(kvp => now - kvp.Value.FirstAttempt > LockoutDuration && 
                                  (!kvp.Value.LockedUntil.HasValue || now > kvp.Value.LockedUntil.Value))
                    .Select(kvp => kvp.Key)
                    .ToList();

                foreach (var key in toRemove)
                {
                    _attempts.TryRemove(key, out _);
                }

                if (toRemove.Any())
                {
                    _logger.LogInformation("Cleaned up {Count} old rate limit entries", toRemove.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during rate limit cleanup");
            }
        }
    }
}
