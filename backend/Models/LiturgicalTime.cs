using Core.Common.Entities;

namespace MusicasIgreja.Api.Models;

public class LiturgicalTime : ISlugEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public ICollection<FileLiturgicalTime> FileLiturgicalTimes { get; set; } = new List<FileLiturgicalTime>();
}
