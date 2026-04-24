using Microsoft.EntityFrameworkCore;
using MusicasIgreja.Api.Data;
using MusicasIgreja.Api.DTOs;
using MusicasIgreja.Api.Models;
using MusicasIgreja.Api.Services.Interfaces;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;

namespace MusicasIgreja.Api.Services;

public class ListService : IListService
{
    private readonly AppDbContext _context;
    private readonly IFileService _fileService;
    private readonly IChordPdfRenderer _chordRenderer;
    private readonly ILogger<ListService> _logger;

    public ListService(AppDbContext context, IFileService fileService, IChordPdfRenderer chordRenderer, ILogger<ListService> logger)
    {
        _context = context;
        _fileService = fileService;
        _chordRenderer = chordRenderer;
        _logger = logger;
    }

    public async Task<List<MergeListSummaryDto>> GetListsAsync(int workspaceId, string? search, string? sortBy, string? sortOrder)
    {
        var query = _context.MergeLists
            .Where(l => l.WorkspaceId == workspaceId)
            .Include(l => l.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l => EF.Functions.ILike(AppDbContext.Unaccent(l.Name), AppDbContext.Unaccent($"%{search}%")));

        query = (sortBy?.ToLower(), sortOrder?.ToLower()) switch
        {
            ("name", "asc") => query.OrderBy(l => l.Name),
            ("name", "desc") => query.OrderByDescending(l => l.Name),
            ("created_date", "asc") => query.OrderBy(l => l.CreatedDate),
            ("created_date", "desc") => query.OrderByDescending(l => l.CreatedDate),
            ("file_count", "asc") => query.OrderBy(l => l.Items.Count),
            ("file_count", "desc") => query.OrderByDescending(l => l.Items.Count),
            ("updated_date", "asc") => query.OrderBy(l => l.UpdatedDate),
            _ => query.OrderByDescending(l => l.UpdatedDate)
        };

        return await query.Select(l => new MergeListSummaryDto(
            l.Id, l.Name, l.Observations, l.CreatedDate, l.UpdatedDate, l.Items.Count
        )).ToListAsync();
    }

    public async Task<MergeListDetailDto?> GetListByIdAsync(int id)
    {
        var list = await _context.MergeLists
            .Include(l => l.Items).ThenInclude(i => i.PdfFile).ThenInclude(p => p.FileCategories).ThenInclude(fc => fc.Category)
            .Include(l => l.Items).ThenInclude(i => i.PdfFile).ThenInclude(p => p.FileCustomFilters).ThenInclude(fcf => fcf.FilterValue).ThenInclude(v => v.FilterGroup)
            .Include(l => l.Items).ThenInclude(i => i.PdfFile).ThenInclude(p => p.FileArtists).ThenInclude(fa => fa.Artist)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list == null) return null;

        return new MergeListDetailDto(
            list.Id, list.Name, list.Observations, list.CreatedDate, list.UpdatedDate,
            list.Items.OrderBy(i => i.OrderPosition).Select(i => new MergeListItemDto(
                i.Id, i.OrderPosition,
                new MergeListFileDto(
                    i.PdfFile.Id, i.PdfFile.Filename, i.PdfFile.SongName,
                    i.PdfFile.FileArtists.Select(fa => fa.Artist.Name).FirstOrDefault(),
                    i.PdfFile.FileCategories.Select(fc => fc.Category.Name).FirstOrDefault(),
                    i.PdfFile.FileCustomFilters
                        .GroupBy(fcf => fcf.FilterValue.FilterGroup)
                        .ToDictionary(g => g.Key.Slug, g => g.Select(fcf => fcf.FilterValue.Name).ToList()),
                    i.PdfFile.MusicalKey, i.PdfFile.YoutubeLink, i.PdfFile.ContentType
                ),
                i.KeyOverride, i.CapoOverride
            )).ToList()
        );
    }

    public async Task<int> CreateListAsync(int workspaceId, CreateMergeListDto dto)
    {
        var list = new MergeList { Name = dto.Name, Observations = dto.Observations, WorkspaceId = workspaceId };
        _context.MergeLists.Add(list);
        await _context.SaveChangesAsync();

        if (dto.FileIds is { Count: > 0 })
        {
            var validFileIds = await _context.PdfFiles
                .Where(f => dto.FileIds.Contains(f.Id) && f.WorkspaceId == workspaceId)
                .Select(f => f.Id)
                .ToListAsync();

            for (int i = 0; i < validFileIds.Count; i++)
            {
                _context.MergeListItems.Add(new MergeListItem
                {
                    MergeListId = list.Id, PdfFileId = validFileIds[i], OrderPosition = i
                });
            }
            await _context.SaveChangesAsync();
        }

        return list.Id;
    }

    public async Task<bool> UpdateListAsync(int id, UpdateMergeListDto dto)
    {
        var list = await _context.MergeLists.FindAsync(id);
        if (list == null) return false;

        if (dto.Name != null) list.Name = dto.Name;
        if (dto.Observations != null) list.Observations = dto.Observations;
        list.UpdatedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteListAsync(int id)
    {
        var list = await _context.MergeLists.FindAsync(id);
        if (list == null) return false;

        _context.MergeLists.Remove(list);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<int>> AddItemsAsync(int id, List<int> fileIds)
    {
        var list = await _context.MergeLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        if (list == null) return new List<int>();

        var validFileIds = await _context.PdfFiles
            .Where(f => fileIds.Contains(f.Id) && f.WorkspaceId == list.WorkspaceId)
            .Select(f => f.Id)
            .ToListAsync();

        var maxPos = list.Items.Any() ? list.Items.Max(i => i.OrderPosition) : -1;
        var newItems = new List<MergeListItem>();

        foreach (var fileId in validFileIds)
        {
            var item = new MergeListItem { MergeListId = id, PdfFileId = fileId, OrderPosition = ++maxPos };
            _context.MergeListItems.Add(item);
            newItems.Add(item);
        }

        list.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return newItems.Select(i => i.Id).ToList();
    }

    public async Task<bool> ReorderItemsAsync(int id, List<int> itemOrder)
    {
        var list = await _context.MergeLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        if (list == null) return false;

        for (int i = 0; i < itemOrder.Count; i++)
        {
            var item = list.Items.FirstOrDefault(it => it.Id == itemOrder[i]);
            if (item != null) item.OrderPosition = i;
        }

        list.UpdatedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> DuplicateListAsync(int id, string? newName)
    {
        var original = await _context.MergeLists.Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        if (original == null) return -1;

        var newList = new MergeList
        {
            Name = newName ?? $"{original.Name} (cópia)",
            Observations = original.Observations,
            WorkspaceId = original.WorkspaceId
        };
        _context.MergeLists.Add(newList);
        await _context.SaveChangesAsync();

        foreach (var item in original.Items.OrderBy(i => i.OrderPosition))
        {
            _context.MergeListItems.Add(new MergeListItem
            {
                MergeListId = newList.Id, PdfFileId = item.PdfFileId, OrderPosition = item.OrderPosition
            });
        }
        await _context.SaveChangesAsync();
        return newList.Id;
    }

    public async Task<string?> GenerateReportAsync(int id)
    {
        var list = await _context.MergeLists
            .Include(l => l.Items).ThenInclude(i => i.PdfFile).ThenInclude(p => p.FileArtists).ThenInclude(fa => fa.Artist)
            .FirstOrDefaultAsync(l => l.Id == id);
        if (list == null || !list.Items.Any()) return null;

        var lines = list.Items.OrderBy(i => i.OrderPosition).Select(item =>
        {
            var parts = new List<string>();
            parts.Add(!string.IsNullOrEmpty(item.PdfFile.SongName)
                ? item.PdfFile.SongName
                : item.PdfFile.Filename?.Replace(".pdf", "") ?? "Sem título");

            var artist = item.PdfFile.FileArtists.Select(fa => fa.Artist.Name).FirstOrDefault();
            if (!string.IsNullOrEmpty(artist)) parts.Add(artist);
            if (!string.IsNullOrEmpty(item.PdfFile.YoutubeLink)) parts.Add(item.PdfFile.YoutubeLink);

            return string.Join(" - ", parts);
        });

        return string.Join("\n", lines);
    }

    public async Task<(Stream? Stream, string? ListName, string? Error)> ExportListAsync(int id)
    {
        var list = await _context.MergeLists
            .Include(l => l.Items).ThenInclude(i => i.PdfFile)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (list == null)
        {
            _logger.LogWarning("Export failed: list {ListId} not found", id);
            return (null, null, "Lista não encontrada");
        }

        if (!list.Items.Any())
        {
            _logger.LogWarning("Export failed: list {ListId} '{ListName}' has no items", id, list.Name);
            return (null, list.Name, "A lista não possui músicas. Adicione músicas antes de exportar.");
        }

        var orderedItems = list.Items.OrderBy(i => i.OrderPosition).ToList();
        var pdfsToMerge = new List<PdfDocument>();
        var missingFiles = new List<string>();
        var failedCount = 0;

        foreach (var item in orderedItems)
        {
            try
            {
                if (item.PdfFile.ContentType == "chord" && !string.IsNullOrEmpty(item.PdfFile.ChordContent))
                {
                    // Render chord song
                    var key = item.KeyOverride ?? item.PdfFile.MusicalKey ?? "C";
                    var useCapo = item.CapoOverride.HasValue;
                    var chordPdf = _chordRenderer.Render(item.PdfFile.ChordContent, key, useCapo, item.CapoOverride);
                    pdfsToMerge.Add(chordPdf);
                }
                else if (!string.IsNullOrEmpty(item.PdfFile.FilePath))
                {
                    // Read PDF from disk
                    var absPath = _fileService.GetAbsolutePath(item.PdfFile.FilePath);
                    if (System.IO.File.Exists(absPath))
                    {
                        using var input = PdfReader.Open(absPath, PdfDocumentOpenMode.Import);
                        pdfsToMerge.Add(input);
                    }
                    else
                    {
                        missingFiles.Add(item.PdfFile.FilePath);
                    }
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                _logger.LogWarning(ex, "Export list {ListId}: failed to process item {ItemId} '{SongName}'",
                    id, item.Id, item.PdfFile.SongName);
            }
        }

        if (missingFiles.Count > 0)
            _logger.LogWarning("Export list {ListId}: {MissingCount}/{TotalCount} files not found on disk: {MissingFiles}",
                id, missingFiles.Count, orderedItems.Count, string.Join(", ", missingFiles));

        if (pdfsToMerge.Count == 0)
            return (null, list.Name, "Nenhum arquivo ou cifra encontrado para exportar.");

        if (pdfsToMerge.Count == 1)
        {
            var ms = new MemoryStream();
            pdfsToMerge[0].Save(ms, false);
            ms.Position = 0;
            return (ms, list.Name, null);
        }

        using var output = new PdfDocument();
        output.Info.Title = list.Name;
        foreach (var doc in pdfsToMerge)
        {
            for (int i = 0; i < doc.PageCount; i++)
                output.AddPage(doc.Pages[i]);
        }

        if (output.PageCount == 0)
        {
            _logger.LogError("Export list {ListId}: all {Count} documents failed to process", id, pdfsToMerge.Count);
            return (null, list.Name, "Erro ao processar os arquivos. Tente novamente.");
        }

        if (failedCount > 0)
            _logger.LogWarning("Export list {ListId}: {FailedCount}/{TotalCount} items skipped due to errors",
                id, failedCount, orderedItems.Count);

        var outputMs = new MemoryStream();
        output.Save(outputMs, false);
        outputMs.Position = 0;
        return (outputMs, list.Name, null);
    }
}
