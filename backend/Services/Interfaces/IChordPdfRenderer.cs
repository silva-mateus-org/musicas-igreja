using PdfSharpCore.Pdf;

namespace MusicasIgreja.Api.Services.Interfaces;

public interface IChordPdfRenderer
{
    PdfDocument Render(string chordContent, string? key = null, bool useCapo = false, int? capoFret = null);
}
