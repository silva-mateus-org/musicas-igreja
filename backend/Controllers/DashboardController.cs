using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.DTOs;

namespace MusicasIgreja.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetStats()
    {
        var totalMusics = await _context.PdfFiles.CountAsync();
        var totalLists = await _context.MergeLists.CountAsync();
        var totalCategories = await _context.Categories.CountAsync();
        var totalLiturgicalTimes = await _context.LiturgicalTimes.CountAsync();
        var totalArtists = await _context.Artists.CountAsync();
        
        // Calculate total file size in MB
        var totalFileSizeBytes = await _context.PdfFiles
            .SumAsync(f => f.FileSize ?? 0);
        var totalFileSizeMb = totalFileSizeBytes / (1024.0 * 1024.0);
        
        // Calculate total pages
        var totalPages = await _context.PdfFiles
            .SumAsync(f => f.PageCount ?? 0);
        
        // Count musics with YouTube links
        var musicsWithYoutube = await _context.PdfFiles
            .CountAsync(f => !string.IsNullOrEmpty(f.YoutubeLink));
        
        // Calculate average musics per list
        double avgMusicsPerList = 0;
        if (totalLists > 0)
        {
            var totalItems = await _context.MergeListItems.CountAsync();
            avgMusicsPerList = (double)totalItems / totalLists;
        }
        
        // Get largest list
        LargestListDto? largestList = null;
        var largestListData = await _context.MergeLists
            .Include(l => l.Items)
            .OrderByDescending(l => l.Items.Count)
            .Select(l => new { l.Name, Count = l.Items.Count })
            .FirstOrDefaultAsync();
        
        if (largestListData != null && largestListData.Count > 0)
        {
            largestList = new LargestListDto
            {
                Name = largestListData.Name,
                Count = largestListData.Count
            };
        }
        
        // Get most popular category
        MostPopularCategoryDto? mostPopularCategory = null;
        var categoryData = await _context.PdfFiles
            .Where(f => !string.IsNullOrEmpty(f.Category))
            .GroupBy(f => f.Category)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .FirstOrDefaultAsync();
        
        if (categoryData != null)
        {
            mostPopularCategory = new MostPopularCategoryDto
            {
                Name = categoryData.Name ?? "Desconhecido",
                Count = categoryData.Count
            };
        }

        var stats = new DashboardStatsDto
        {
            TotalMusics = totalMusics,
            TotalLists = totalLists,
            TotalCategories = totalCategories,
            TotalLiturgicalTimes = totalLiturgicalTimes,
            TotalArtists = totalArtists,
            TotalFileSizeMb = Math.Round(totalFileSizeMb, 2),
            TotalPages = totalPages,
            MusicsWithYoutube = musicsWithYoutube,
            AvgMusicsPerList = Math.Round(avgMusicsPerList, 2),
            LargestList = largestList,
            MostPopularCategory = mostPopularCategory
        };

        return Ok(stats);
    }

    // These endpoints are kept for backward compatibility.
    // Prefer using /api/categories, /api/liturgical_times, and /api/filters/suggestions

    [HttpGet("get_categories")]
    public async Task<ActionResult<List<string>>> GetCategories()
    {
        var categories = await _context.Categories
            .OrderBy(c => c.Name)
            .Select(c => c.Name)
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("get_liturgical_times")]
    public async Task<ActionResult<List<string>>> GetLiturgicalTimes()
    {
        var times = await _context.LiturgicalTimes
            .OrderBy(l => l.Name)
            .Select(l => l.Name)
            .ToListAsync();

        return Ok(times);
    }

    [HttpGet("get_artists")]
    public async Task<ActionResult<List<string>>> GetArtists()
    {
        // Get artists from the artists table
        var registeredArtists = await _context.Artists
            .OrderBy(a => a.Name)
            .Select(a => a.Name)
            .ToListAsync();

        // Also include unique artists from pdf_files for backward compatibility
        var fileArtists = await _context.PdfFiles
            .Where(f => f.Artist != null && f.Artist != "")
            .Select(f => f.Artist!)
            .Distinct()
            .ToListAsync();

        var allArtists = registeredArtists.Union(fileArtists).OrderBy(a => a).ToList();
        return Ok(allArtists);
    }

    [HttpGet("top-artists")]
    public async Task<ActionResult<object>> GetTopArtists([FromQuery] int limit = 10)
    {
        var topArtists = await _context.PdfFiles
            .Where(f => f.Artist != null && f.Artist != "")
            .GroupBy(f => f.Artist)
            .Select(g => new { artist = g.Key, song_count = g.Count() })
            .OrderByDescending(x => x.song_count)
            .Take(limit)
            .ToListAsync();

        return Ok(new { artists = topArtists });
    }

    [HttpGet("top-songs-by-category")]
    public async Task<ActionResult<object>> GetTopSongsByCategory([FromQuery] string category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return BadRequest(new { error = "Categoria é obrigatória" });

        // Get files in category with usage count (how many lists they appear in)
        var songs = await _context.PdfFiles
            .Where(f => f.Category == category)
            .Select(f => new
            {
                id = f.Id,
                song_name = f.SongName,
                artist = f.Artist,
                musical_key = f.MusicalKey,
                usage_count = _context.MergeListItems.Count(mli => mli.PdfFileId == f.Id)
            })
            .OrderByDescending(f => f.usage_count)
            .ThenBy(f => f.song_name)
            .Take(10)
            .ToListAsync();

        return Ok(new { songs });
    }

    [HttpGet("uploads-timeline")]
    public async Task<ActionResult<object>> GetUploadsTimeline([FromQuery] int months = 12)
    {
        var startDate = DateTime.UtcNow.AddMonths(-months);
        
        // Get all files from the period
        var files = await _context.PdfFiles
            .Where(f => f.UploadDate >= startDate)
            .Select(f => new { f.UploadDate })
            .ToListAsync();
        
        // Group by month in memory to avoid EF Core translation issues
        var monthlyData = files
            .GroupBy(f => new { f.UploadDate.Year, f.UploadDate.Month })
            .Select(g => new { 
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count() 
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        // Format month names in Portuguese
        var monthNames = new[] { "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez" };
        
        var timeline = monthlyData.Select(m => new {
            month_name = $"{monthNames[m.Month]}/{m.Year}",
            upload_count = m.Count
        }).ToList();

        return Ok(new { timeline });
    }
}
