using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.DTOs;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/filters")]
public class FiltersController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly string[] MusicalKeys = 
    {
        "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
        "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm"
    };

    public FiltersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("suggestions")]
    public async Task<ActionResult<object>> GetSuggestions(
        [FromQuery] List<string>? category = null,
        [FromQuery] List<string>? liturgical_time = null,
        [FromQuery] List<string>? artist = null,
        [FromQuery] string? musical_key = null)
    {
        var query = _context.PdfFiles.AsQueryable();

        // Resolve category slugs to names for filtering
        var categorySlugs = category?.Where(c => !string.IsNullOrWhiteSpace(c)).ToList();
        if (categorySlugs != null && categorySlugs.Count > 0)
        {
            var categoryNames = await _context.Categories
                .Where(c => categorySlugs.Contains(c.Slug))
                .Select(c => c.Name)
                .ToListAsync();

            if (categoryNames.Count > 0)
            {
                query = query.Where(f => 
                    categoryNames.Contains(f.Category!) ||
                    f.FileCategories.Any(fc => categoryNames.Contains(fc.Category.Name)));
            }
        }

        // Resolve liturgical time slugs to names for filtering
        var liturgicalTimeSlugs = liturgical_time?.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        if (liturgicalTimeSlugs != null && liturgicalTimeSlugs.Count > 0)
        {
            var ltNames = await _context.LiturgicalTimes
                .Where(l => liturgicalTimeSlugs.Contains(l.Slug))
                .Select(l => l.Name)
                .ToListAsync();

            if (ltNames.Count > 0)
            {
                query = query.Where(f => 
                    ltNames.Contains(f.LiturgicalTime!) ||
                    f.FileLiturgicalTimes.Any(flt => ltNames.Contains(flt.LiturgicalTime.Name)));
            }
        }

        // Resolve artist slugs to names for filtering
        var artistSlugs = artist?.Where(a => !string.IsNullOrWhiteSpace(a)).ToList();
        if (artistSlugs != null && artistSlugs.Count > 0)
        {
            var artistNames = await _context.Artists
                .Where(a => artistSlugs.Contains(a.Slug))
                .Select(a => a.Name)
                .ToListAsync();

            if (artistNames.Count > 0)
            {
                query = query.Where(f => artistNames.Contains(f.Artist!));
            }
        }

        if (!string.IsNullOrWhiteSpace(musical_key))
        {
            query = query.Where(f => f.MusicalKey == musical_key);
        }

        var filteredFiles = await query
            .Include(f => f.FileCategories).ThenInclude(fc => fc.Category)
            .Include(f => f.FileLiturgicalTimes).ThenInclude(flt => flt.LiturgicalTime)
            .ToListAsync();

        var availableCategories = filteredFiles
            .SelectMany(f => f.FileCategories.Select(fc => new FilterOptionDto(fc.Category.Slug, fc.Category.Name)))
            .DistinctBy(o => o.Slug)
            .OrderBy(o => o.Label)
            .ToList();

        var availableLiturgicalTimes = filteredFiles
            .SelectMany(f => f.FileLiturgicalTimes.Select(flt => new FilterOptionDto(flt.LiturgicalTime.Slug, flt.LiturgicalTime.Name)))
            .DistinctBy(o => o.Slug)
            .OrderBy(o => o.Label)
            .ToList();

        var availableArtists = filteredFiles
            .Where(f => !string.IsNullOrEmpty(f.Artist))
            .Select(f => f.Artist!)
            .Distinct()
            .OrderBy(a => a)
            .Select(a =>
            {
                var registeredArtist = _context.Artists.Local.FirstOrDefault(ar => ar.Name == a);
                var slug = registeredArtist?.Slug ?? Core.Common.Extensions.StringExtensions.ToSlug(a);
                return new FilterOptionDto(slug, a);
            })
            .ToList();

        var availableMusicalKeys = filteredFiles
            .Where(f => !string.IsNullOrEmpty(f.MusicalKey))
            .Select(f => f.MusicalKey!)
            .Distinct()
            .OrderBy(k => Array.IndexOf(MusicalKeys, k))
            .ToList();

        return Ok(new
        {
            categories = availableCategories,
            liturgical_times = availableLiturgicalTimes,
            artists = availableArtists,
            musical_keys = availableMusicalKeys.Any() ? availableMusicalKeys : MusicalKeys.ToList()
        });
    }
}
